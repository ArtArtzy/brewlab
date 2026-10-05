import { BrewLab } from "@/features/app";
import { authenticated } from "@/lib/server/session";
export const dynamic = "force-dynamic";
export default async function Page() {
  const configured = !!(
    process.env.SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY &&
    process.env.APP_PIN &&
    process.env.SESSION_SECRET
  );
  let unlocked = false;
  if (configured) {
    try {
      unlocked = await authenticated();
    } catch {}
  }
  return <BrewLab unlocked={unlocked} configured={configured} />;
}
