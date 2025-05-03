// app/api/auth/[...nextauth]/route.js
import NextAuth from "next-auth"
import FacebookProvider from "next-auth/providers/facebook"
import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

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
        // Add credentials provider for token-based authentication
        CredentialsProvider({
            id: "facebook-token",
            name: "Facebook Token",
            credentials: {
                accessToken: { label: "Access Token", type: "text" }
            },
            async authorize(credentials) {
                if (!credentials?.accessToken) return null
                
                try {
                    // Validate token by fetching user data from Facebook
                    const response = await fetch(
                        `https://graph.facebook.com/v18.0/me?fields=id,name,email&access_token=${credentials.accessToken}`
                    )
                    
                    const userData = await response.json()
                    
                    if (!response.ok || userData.error) {
                        throw new Error(userData.error?.message || "Invalid access token")
                    }
                    
                    // Return user data for JWT
                    return {
                        id: userData.id,
                        name: userData.name,
                        email: userData.email,
                        image: `https://graph.facebook.com/${userData.id}/picture?type=large`,
                        accessToken: credentials.accessToken,
                    }
                } catch (error) {
                    console.error("Token authorization error:", error)
                    return null
                }
            }
        })
    ],
    callbacks: {
        async jwt({ token, account, user }: any) {
            // Persist the OAuth access_token to the token right after sign in
            if (account) {
                token.accessToken = account.access_token
            }
            
            // For credentials provider (manual token input)
            if (user?.accessToken) {
                token.accessToken = user.accessToken
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
    debug: process.env.NODE_ENV === "development",
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST, authOptions }