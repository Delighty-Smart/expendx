import { useEffect, useState } from "react"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  // The app toggles the `dark` class on <html> directly (SettingsContext),
  // so mirror that instead of relying on prefers-color-scheme.
  const [theme, setTheme] = useState<"light" | "dark">("light")

  useEffect(() => {
    const sync = () => {
      setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light")
    }

    sync()

    const observer = new MutationObserver(sync)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    })

    return () => observer.disconnect()
  }, [])

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-m3-inverse-surface group-[.toaster]:text-m3-inverse-on-surface group-[.toaster]:border-none group-[.toaster]:rounded-m3-xs group-[.toaster]:shadow-m3-3",
          description:
            "group-[.toast]:text-[color-mix(in_srgb,var(--m3-inverse-on-surface)_78%,transparent)]",
          actionButton:
            "group-[.toast]:bg-m3-inverse-primary group-[.toast]:text-m3-inverse-on-surface group-[.toast]:rounded-m3-full",
          cancelButton:
            "group-[.toast]:bg-[color-mix(in_srgb,var(--m3-inverse-on-surface)_12%,transparent)] group-[.toast]:text-m3-inverse-on-surface group-[.toast]:rounded-m3-full",
          closeButton:
            "group-[.toast]:bg-[color-mix(in_srgb,var(--m3-inverse-on-surface)_12%,transparent)] group-[.toast]:text-m3-inverse-on-surface",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }