"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";

// Ajout de photo de profil sur place (sans passer par « Mon profil ») —
// même stockage que ProfileForm.uploadAvatar : bucket « avatars », fichier
// {userId}/avatar.{ext}, puis users.avatar_url.
export default function AvatarUploadButton({
  userId,
  className,
  onUploaded,
}: {
  userId: string;
  className: string;
  onUploaded?: () => void;
}) {
  const t = useTranslations("photoReminder");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) { setError(t("errorImageSize")); return; }
    setUploading(true);
    setError("");
    const supabase = createClient();
    const ext = file.name.split(".").pop() ?? "jpg";
    const { data, error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(`${userId}/avatar.${ext}`, file, { cacheControl: "3600", upsert: true });
    if (uploadError) {
      console.error("[avatar upload]", uploadError);
      setError(t("errorUpload"));
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(data.path);
    await supabase.from("users").update({ avatar_url: urlData.publicUrl }).eq("id", userId);
    setUploading(false);
    onUploaded?.();
    // Rafraîchit les données serveur (en-tête, bandeaux) qui lisent avatar_url.
    router.refresh();
  };

  return (
    <>
      <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className={className}>
        {uploading ? t("uploading") : t("addPhotoCta")}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      {error && <p className="text-sm text-error-600 mt-2">{error}</p>}
    </>
  );
}
