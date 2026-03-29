import { auth } from "../../auth";

export async function getSession() {
  const session = await auth();
  if (!session?.user) return null;
  return {
    user: {
      id: (session.user as any).id as string,
      name: session.user.name as string,
      email: session.user.email as string,
      role: (session.user as any).role as string,
    },
  };
}
