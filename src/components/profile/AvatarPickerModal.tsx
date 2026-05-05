"use client";

import { Avatar } from "@/components/avatars/Avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { avatarCatalog, defaultAvatarId, isAvatarId } from "@/lib/avatars/avatarCatalog";
import { cn } from "@/lib/utils";

type AvatarPickerModalProps = {
  open: boolean;
  saving?: boolean;
  selectedAvatarId: string;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
  onSelectAvatar: (avatarId: string) => void;
};

export function AvatarPickerModal({
  open,
  saving = false,
  selectedAvatarId,
  onOpenChange,
  onSave,
  onSelectAvatar,
}: AvatarPickerModalProps) {
  const safeSelectedAvatarId = isAvatarId(selectedAvatarId)
    ? selectedAvatarId
    : defaultAvatarId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(760px,calc(100vh-2rem))] max-w-3xl overflow-hidden rounded-md border border-[#E7E1D8] bg-[#FBFAF7] p-0 text-[#111111]">
        <DialogHeader className="border-b border-[#E7E1D8] px-5 py-4">
          <DialogTitle className="font-heading text-[1.65rem] leading-tight text-[#111111]">
            Choose your character
          </DialogTitle>
          <DialogDescription className="text-sm leading-6 text-[#66625C]">
            Pick a NYC pixel character for your AI Atlas profile.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[56vh] overflow-y-auto px-5 py-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {avatarCatalog.map((avatar) => {
              const selected = avatar.id === safeSelectedAvatarId;

              return (
                <button
                  key={avatar.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelectAvatar(avatar.id)}
                  className={cn(
                    "relative rounded-md border border-[#E7E1D8] bg-[#FBFAF7] p-3 text-left transition hover:bg-[#F8F6F1]",
                    selected && "border-[#9A3D2B] bg-[rgb(154_61_43_/_0.07)]",
                  )}
                >
                  {selected ? (
                    <span className="absolute right-2 top-2 rounded-md border border-[#E7E1D8] bg-[#FBFAF7] px-2 py-0.5 text-[11px] font-semibold text-[#9A3D2B]">
                      Selected
                    </span>
                  ) : null}
                  <Avatar avatarId={avatar.id} size="lg" className="size-[68px]" />
                  <p className="mt-3 text-sm font-semibold text-[#111111]">
                    {avatar.label}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <DialogFooter className="m-0 flex-row justify-end rounded-b-md border-t border-[#E7E1D8] bg-[#F8F6F1] px-5 py-4">
          <Button
            type="button"
            variant="outline"
            className="border-[#E7E1D8] bg-[#FBFAF7]"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="app-primary-button"
            disabled={saving}
            onClick={onSave}
          >
            Save avatar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
