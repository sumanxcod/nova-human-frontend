import ResetPasswordClient from "././ResetPasswordClient";

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { token?: string };
}) {
  const token = typeof searchParams?.token === "string" ? searchParams.token : "";
  return <ResetPasswordClient initialToken={token} />;
}
