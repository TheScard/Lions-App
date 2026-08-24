"use client";

export function ConfirmSubmitButton({
  action,
  label,
  confirmMessage = "Wirklich fortfahren?",
  variant = "danger",
}: {
  action: (formData: FormData) => void | Promise<void>;
  label: string;
  confirmMessage?: string;
  variant?: "danger" | "neutral";
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <button
        type="submit"
        className={`text-sm font-medium hover:underline ${
          variant === "danger" ? "text-danger" : "text-primary"
        }`}
      >
        {label}
      </button>
    </form>
  );
}
