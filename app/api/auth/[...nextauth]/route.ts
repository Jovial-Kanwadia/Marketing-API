import NextAuth from "next-auth"
import FacebookProvider from "next-auth/providers/facebook"
import { NextAuthOptions } from "next-auth"

const authOptions: NextAuthOptions = {
    providers: [
        FacebookProvider({
            clientId: process.env.FACEBOOK_CLIENT_ID!,
            clientSecret: process.env.FACEBOOK_CLIENT_SECRET!,
            authorization: {
                params: {
                    scope: "ads_management,ads_read,business_management",
                },
            },
        }),
    ],
    callbacks: {
        async jwt({ token, account }: any) {
            // Persist the OAuth access_token to the token right after sign in
            if (account) {
                token.accessToken = account.access_token
            }
            return token
        },
        async session({ session, token }: any) {
            // Send properties to the client, like an access_token from a provider
            session.accessToken = token.accessToken
            return session
        },
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
    },
    debug: true,
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST, authOptions }
