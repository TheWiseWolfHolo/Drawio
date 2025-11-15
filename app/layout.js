import "./globals.css";

export const metadata = {
  title: "Drawio",
  description: "AI 驱动的图表生成",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">{children}</body>
    </html>
  );
}
