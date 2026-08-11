import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Robotics & Autonomous Systems Club",
  description: "Engineering collaboration platform for the Robotics Club.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
