import notifier from "node-notifier";

export function notify(title: string, message: string): void {
  try {
    notifier.notify({
      title,
      message,
      sound: false,
      wait: false,
    });
  } catch (err) {
    // Fail gracefully if notifications aren't available on the system
    // or if another error occurs. We don't want to break the terminal UI.
  }
}
