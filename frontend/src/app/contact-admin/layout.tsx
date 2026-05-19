import Layout from "@/frontend/components/app/layout";

export default function ContactAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Layout>{children}</Layout>;
}
