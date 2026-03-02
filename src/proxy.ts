import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * サーバーサイドで認証状態を検証し、未認証ならログインページへリダイレクトする。
 * クライアント JS に依存しないため、クライアントサイドガードより確実。
 * Next.js 16 では middleware.ts → proxy.ts に移行し、関数名も proxy に変更が必要。
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // リクエスト側にもセット（後続処理用）
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          // レスポンス側にセット（ブラウザへの Set-Cookie）
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // getUser() はサーバーで JWT を検証する（getSession() より安全）
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login_signup";
    loginUrl.searchParams.set("mode", "login");
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/home",
    "/blog/:path*",
    "/gates/new",
    // /gates/[id]/edit にマッチ（/gates/[id] 自体は公開）
    "/gates/:id/edit",
    "/settings/:path*",
  ],
};
