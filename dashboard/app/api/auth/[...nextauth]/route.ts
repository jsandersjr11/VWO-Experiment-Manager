import NextAuth, { AuthOptions, User, Account, Profile, Session } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { JWT } from "next-auth/jwt";

export const authOptions: AuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
                params: {
                    prompt: "consent",
                    access_type: "offline",
                    response_type: "code",
                    hd: process.env.ALLOWED_DOMAIN, // Restrict to organization domain
                },
            },
        }),
    ],
    callbacks: {
        async signIn({ user, account, profile }: { user: User; account: Account | null; profile?: Profile }) {
            // Verify user email domain
            const allowedDomain = process.env.ALLOWED_DOMAIN;
            if (user.email && allowedDomain) {
                const emailDomain = user.email.split("@")[1];
                if (emailDomain !== allowedDomain) {
                    console.log(`Access denied for ${user.email} - not from ${allowedDomain}`);
                    return false;
                }
            }
            return true;
        },
        async session({ session, token }: { session: Session; token: JWT }) {
            // Add user info to session
            if (session.user && token.sub) {
                (session.user as any).id = token.sub;
            }
            return session;
        },
    },
    pages: {
        signIn: "/auth/signin",
        error: "/auth/error",
    },
    secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
