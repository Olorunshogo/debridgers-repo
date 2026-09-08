import {
  HelpGuideDialog as HelpGuideDialogView,
  useDialog,
  supportWhatsAppHref,
  type HelpGuideSection,
} from "@debridgers/ui-web";

/*
 * Glue between the dialog engine and the help guide.
 *
 * Purely presentational content, so there is nothing to fetch here.
 * It still goes through the engine so it inherits Escape and backdrop dismissal, focus trapping and scroll locking rather than hand-rolling them again.
 * Registered as HELP_GUIDE in app/providers/dialog-registry.ts.
 */

interface HelpGuideDialogProps {
  title: string;
  subtitle: string;
  sections: HelpGuideSection[];
}

export default function HelpGuideDialog({
  title,
  subtitle,
  sections,
}: HelpGuideDialogProps) {
  const { closeDialog } = useDialog();

  return (
    <HelpGuideDialogView
      title={title}
      subtitle={subtitle}
      sections={sections}
      whatsAppHref={supportWhatsAppHref()}
      onClose={closeDialog}
    />
  );
}
