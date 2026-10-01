import { createAuthClient } from "better-auth/react";
import { clientEnv } from "@/lib/env/client";

export const { signIn, signUp, useSession } = createAuthClient({
	baseURL: clientEnv.NEXT_PUBLIC_SITE_URL,
});
