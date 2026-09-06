import { useState } from "react";
import { DialogHeader, SubmitButton, useDialog } from "@debridgers/ui-web";
import { stageCart, type StagedCartItem } from "@debridgers/api-client";
import { dashboardAppUrl } from "../../utils/app-urls";

/*
 * The checkout auth gate, replacing AuthDialog.
 *
 * debridgers-marketing has no buyer dashboard, so authenticating inline here
 * (as AuthDialog used to) would create a session on the wrong origin - useless
 * on buyer.debridgers.com, which manages its own login independently. This
 * dialog does one thing instead: stage the guest cart server-side, then send
 * the browser to buyer.debridgers.com/login with the resulting token. Signup
 * is reached from that login page's own "Sign up" link, not from here.
 */

interface CheckoutGateDialogProps {
  items: StagedCartItem[];
}

export default function CheckoutGateDialog({ items }: CheckoutGateDialogProps) {
  const { closeDialog, setDialogLoading } = useDialog();
  const [isStaging, setIsStaging] = useState<boolean>(false);

  async function handleLogin(): Promise<void> {
    setIsStaging(true);
    setDialogLoading(true);

    try {
      const { token } = await stageCart(items);
      window.location.href = `${dashboardAppUrl("buyer")}/login?cartToken=${encodeURIComponent(token)}`;
    } catch {
      /* Staging failed - still let the buyer log in, just without the cart
         carried over, rather than blocking checkout entirely. */
      window.location.href = `${dashboardAppUrl("buyer")}/login`;
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <DialogHeader
        title="Log in to checkout"
        description="Your cart will be waiting for you once you're signed in."
        onClose={closeDialog}
      />

      <SubmitButton
        type="button"
        variant="primary"
        loading={isStaging}
        loadingText="Preparing checkout..."
        onClick={() => void handleLogin()}
      >
        Log in
      </SubmitButton>
    </div>
  );
}
