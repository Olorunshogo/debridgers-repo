import type { ComponentType } from "react";

/*
 * Types for the dialog engine.
 *
 * A consuming app declares a registry mapping its own dialog keys to lazy
 * imports, so dialog code is only downloaded when a dialog is first opened.
 * The engine itself knows no dialog names.
 */

/** Props a dialog receives are app-defined, so this is the open payload shape. */
export type DialogProps = Record<string, unknown>;

/*
 * A lazy module loader whose default export is the dialog component.
 *
 * The loader's default is `unknown` because each registered dialog declares its
 * own specific props, and React props are contravariant - no single concrete
 * type accepts an arbitrary set of components. The provider narrows it once, at
 * the lazy() call. Props are never inspected by the engine; they are passed
 * straight through from triggerDialog, so type safety lives at the call site.
 */
export type DialogComponent = ComponentType<Record<string, unknown>>;

export type DialogLoader = () => Promise<{ default: unknown }>;

export type DialogRegistry = Record<string, DialogLoader>;

export interface OpenDialog {
  /** Registry key. */
  key: string;
  props: DialogProps;
  /** Distinguishes two open instances of the same key in the stack. */
  id: number;
}

export interface DialogContextValue {
  /** Opens a dialog by registry key, pushing it onto the stack. */
  triggerDialog: (key: string, props?: DialogProps) => void;
  /** Closes the topmost dialog. */
  closeDialog: () => void;
  /** Closes every open dialog. */
  closeAllDialogs: () => void;
  /** Shows or hides the engine-level blocking overlay. */
  setDialogLoading: (loading: boolean) => void;
  /*
   * Turns backdrop and Escape dismissal off for a dialog that gates the page
   * behind it. Resets to true whenever a dialog closes, so a gate cannot leak
   * onto the next one.
   */
  setDialogDismissible: (dismissible: boolean) => void;
  openDialogs: readonly OpenDialog[];
}
