import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { apiFetch, apiMutate, ApiError } from "@debridgers/api-client";
import { CheckCircle, MapPin, User, Phone, DollarSign } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import {
  AlertBanner,
  TextInputField,
  TextareaField,
  SubmitButton,
  TableStatusBadge,
} from "@debridgers/ui-web";
import { UploadField, type PhotoUpload } from "@debridgers/ui-web";

import { buildPageMeta } from "../../../lib/seo";
export function meta() {
  return buildPageMeta({
    title: "Verify Delivery | Debridgers Admin",
    description: "Verify Delivery | Debridgers Admin",
    path: "/deliveries/orderId/verify",
    noIndex: true,
  });
}

interface OrderDetails {
  id: number;
  order_reference: string;
  buyer_name: string;
  buyer_phone: string;
  delivery_address: string;
  amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  delivery_verified_at?: string;
}

interface ApiOrderDetailsResponse {
  id: number;
  order_reference: string;
  buyer_name: string;
  buyer_phone: string;
  delivery_address: string;
  amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  delivery_verified_at?: string;
}

export default function VerifyDelivery() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [photos, setPhotos] = useState<PhotoUpload[]>([]);
  const [notes, setNotes] = useState<string>("");
  /*
   * Who actually took delivery. Left blank rather than prefilled with the
   * buyer's name: this used to send the buyer regardless of who was standing at
   * the gate, which is the one detail proof of delivery exists to record.
   */
  const [recipientName, setRecipientName] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<boolean>(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const data = await apiFetch<ApiOrderDetailsResponse>(
          `/admin/deliveries/${orderId}`,
        );
        setOrder(data);
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not load these order details. Check your connection and retry.",
        );
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (photos.length === 0) {
      setError("Please upload at least one photo");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await apiMutate(`/admin/deliveries/${orderId}/verify`, {
        method: "POST",
        body: JSON.stringify({
          photos: photos.map((p) => p.dataUrl),
          notes: notes.trim() || undefined,
          recipient_name: recipientName.trim() || undefined,
        }),
      });

      setSuccess(true);
      setTimeout(() => {
        navigate("/admin-dashboard/deliveries");
      }, 2000);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to verify delivery. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="border-t-primary border-line h-12 w-12 animate-spin rounded-full border-4" />
          <p className="text-body">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4 py-16">
        <AlertBanner
          tone="danger"
          title="Order not found"
          description={
            error ||
            "This order may have been removed, or the link is out of date."
          }
        />
        <SubmitButton
          type="button"
          variant="secondary"
          onClick={() => navigate("/admin-dashboard/deliveries")}
        >
          Back to Deliveries
        </SubmitButton>
      </div>
    );
  }

  if (order.delivery_verified_at) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4 py-16">
        <AlertBanner
          tone="success"
          icon={CheckCircle}
          title="Delivery already verified"
          description={`Verified on ${new Date(
            order.delivery_verified_at,
          ).toLocaleDateString("en-NG")}.`}
        />
        <SubmitButton
          type="button"
          variant="secondary"
          onClick={() => navigate("/admin-dashboard/deliveries")}
        >
          Back to Deliveries
        </SubmitButton>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-200 flex-col gap-6">
      <AnimatePresence>
        {success && (
          <AlertBanner
            key="success"
            tone="success"
            title="Delivery verified successfully"
            description="Redirecting to the deliveries list..."
          />
        )}

        {error && (
          <AlertBanner
            key="error"
            tone="danger"
            title="Could not verify this delivery"
            description={error}
            onDismiss={() => setError("")}
          />
        )}
      </AnimatePresence>

      {/* Order Summary */}
      <div className="border-line rounded-2xl border bg-white p-6">
        <h2 className="font-syne text-heading mb-4 text-lg font-bold">
          Order {order.order_reference}
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="flex items-start gap-3">
            <User size={18} className="text-primary mt-0.5 shrink-0" />
            <div className="flex flex-col gap-1">
              <p className="text-body text-xs font-semibold uppercase">Buyer</p>
              <p className="text-heading font-semibold">{order.buyer_name}</p>
              <p className="text-body flex items-center gap-1 text-sm">
                <Phone size={14} />
                {order.buyer_phone}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <DollarSign size={18} className="text-primary mt-0.5 shrink-0" />
            <div className="flex flex-col items-start gap-1">
              <p className="text-body text-xs font-semibold uppercase">
                Amount
              </p>
              <p className="text-heading font-semibold">
                ₦{(order.amount / 100).toLocaleString()}
              </p>
              {/* The badge already owns the status token pairing. */}
              <TableStatusBadge
                label={order.payment_status}
                tone={order.payment_status === "paid" ? "success" : "warning"}
              />
            </div>
          </div>

          <div className="flex items-start gap-3 sm:col-span-2">
            <MapPin size={18} className="text-primary mt-0.5 shrink-0" />
            <div className="flex flex-col gap-1">
              <p className="text-body text-xs font-semibold uppercase">
                Delivery Address
              </p>
              <p className="text-heading font-semibold">
                {order.delivery_address}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Form */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <div className="border-line rounded-2xl border bg-white p-6">
          <UploadField
            kind="photo"
            label="Upload Proof of Delivery"
            required
            photos={photos}
            onPhotosChange={setPhotos}
            hint="Drag and drop, or click to browse. At least one photo is required."
          />
        </div>

        <div className="border-line rounded-2xl border bg-white p-6">
          <TextInputField
            label="Received by"
            placeholder="Name of the person who took delivery"
            value={recipientName}
            onChange={(e) => setRecipientName(e.target.value)}
          />
        </div>

        <div className="border-line rounded-2xl border bg-white p-6">
          <TextareaField
            label="Delivery Notes"
            rows={4}
            placeholder="Add any notes about the delivery (e.g. 'Left with security guard', 'Partial delivery')."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <SubmitButton
            type="button"
            variant="secondary"
            fullWidth
            onClick={() => navigate("/admin-dashboard/deliveries")}
          >
            Cancel
          </SubmitButton>
          <SubmitButton
            fullWidth
            icon={CheckCircle}
            loading={submitting}
            loadingText="Verifying..."
            disabled={photos.length === 0}
          >
            Confirm Delivery
          </SubmitButton>
        </div>
      </form>
    </div>
  );
}
