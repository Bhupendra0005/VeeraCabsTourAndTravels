"use client";

import { CreditCard, Download, FileText, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatINR } from "@/lib/booking/config";
import { openCheckout, postJson, verifyPayment, type PayOrder } from "@/lib/payments/checkout-client";
import { ui } from "@/components/ui/styles";
import { cn } from "@/lib/utils/cn";

type Props = {
  bookingId: string;
  payLabel: string | null;
  canCancel: boolean;
  /** 0-100: how much of what was paid goes back if cancelled right now. */
  refundPercent: number;
  paidAmount: number;
  /** e.g. "1 hour": how long before pickup the last refund step ends (nothing is returned after that). */
  cutoffLabel: string;
  canDownloadTicket: boolean;
  canDownloadInvoice: boolean;
  contact: { name: string; email: string; phone: string };
};

export function BookingActions(props: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState("");

  const run = async (task: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      await task();
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const pay = () =>
    run(async () => {
      const order = await postJson<PayOrder>(`/api/bookings/${props.bookingId}/pay`);
      const result = await openCheckout(order, {
        name: props.contact.name,
        email: props.contact.email,
        contact: `+91${props.contact.phone}`,
      });
      if (!result) return setMessage("Payment was not completed.");
      await verifyPayment(result);
      router.replace(`/bookings/${props.bookingId}?paid=1`);
      router.refresh();
    });

  const cancel = () =>
    run(async () => {
      await postJson(`/api/bookings/${props.bookingId}/cancel`);
      setConfirming(false);
      router.refresh();
    });

  return (
    <div className={ui.actions}>
      <div className={ui.actionRow}>
        {props.payLabel ? (
          <button type="button" className="btn btn-gold" onClick={pay} disabled={busy}>
            <CreditCard aria-hidden="true" />
            {props.payLabel}
          </button>
        ) : null}
        {props.canDownloadTicket ? (
          <a className="btn btn-ghost" href={`/api/bookings/${props.bookingId}/ticket`}>
            <Download aria-hidden="true" />
            Download ticket
          </a>
        ) : null}
        {props.canDownloadInvoice ? (
          <a className="btn btn-ghost" href={`/api/bookings/${props.bookingId}/invoice`}>
            <FileText aria-hidden="true" />
            Download invoice
          </a>
        ) : null}
        {props.canCancel && !confirming ? (
          <button type="button" className={cn("btn btn-ghost", ui.danger)} onClick={() => setConfirming(true)} disabled={busy}>
            <XCircle aria-hidden="true" />
            Cancel booking
          </button>
        ) : null}
      </div>

      {confirming ? (
        <div className={ui.confirm} role="alertdialog" aria-label="Confirm cancellation">
          <p>
            {props.paidAmount <= 0
              ? "Nothing has been charged, so no refund is needed."
              : props.refundPercent >= 100
                ? `Full refund of ${formatINR(props.paidAmount)}.`
                : props.refundPercent > 0
                  ? `${props.refundPercent}% refund: ${formatINR(Math.floor((props.paidAmount * props.refundPercent) / 100))} goes back to your original payment method. The rest, ${formatINR(props.paidAmount - Math.floor((props.paidAmount * props.refundPercent) / 100))}, is kept as a cancellation charge.`
                  : `Departure is less than ${props.cutoffLabel} away: a 100% penalty applies and no refund will be given.`}<br />
            Cancel this booking?
          </p>
          <div className={ui.actionRow}>
            <button type="button" className={cn("btn btn-gold", ui.dangerSolid)} onClick={cancel} disabled={busy}>
              {busy ? "Cancelling..." : "Yes, cancel booking"}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)} disabled={busy}>
              Keep booking
            </button>
          </div>
        </div>
      ) : null}

      {message ? (
        <p className="field-error" role="alert">
          {message}
        </p>
      ) : null}
    </div>
  );
}
