import ResetPasswordClient from "./ResetPasswordClient";

type ResetPasswordSearchParams = {
  token?: string;
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: Promise<ResetPasswordSearchParams> | ResetPasswordSearchParams;
}) {
  const resolved = searchParams ? await searchParams : {};
  const token = typeof resolved?.token === "string" ? resolved.token : "";
  return <ResetPasswordClient initialToken={token} />;
}
