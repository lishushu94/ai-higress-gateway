"use client";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useI18n } from "@/lib/i18n-context";
import { Loader2 } from "lucide-react";

interface DeleteKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  keyLabel: string;
  onConfirm: () => Promise<void>;
  isDeleting?: boolean;
}

export function DeleteKeyDialog({
  open,
  onOpenChange,
  keyLabel,
  onConfirm,
  isDeleting = false,
}: DeleteKeyDialogProps) {
  const { t } = useI18n();

  const handleConfirm = async () => {
    await onConfirm();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="mx-auto w-full max-w-md">
        <DrawerHeader>
          <DrawerTitle>{t("provider_keys.delete_dialog_title")}</DrawerTitle>
          <DrawerDescription>
            {t("provider_keys.delete_dialog_description")} <span className="font-mono font-semibold">{keyLabel}</span>
            {t("provider_keys.delete_dialog_warning")}
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter className="border-t bg-background/80 backdrop-blur">
          <div className="flex w-full justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isDeleting}
            >
              {t("provider_keys.delete_cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t("provider_keys.delete_confirm")}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
