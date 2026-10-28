import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { portalPath } from '@/lib/paths';

type CookieToSet = { name: string; value: string; options: CookieOptions };

type Area = 'admin' | 'realtor' | 'public';

// The whole site is public by default (home page, realtor registration).
// /admin/* (except its own login) needs an admins row. /dashboard/* needs
// a users row linked to the session (auth_id). The two are checked against
// different tables so an admin session can't wander into a realtor's
// dashboard and vice versa.
function areaFor(path: string): Area {
  if (path.startsWith('/admin/login')) return 'public';
  if (path.startsWith('/admin')) return 'admin';
  if (path.startsWith('/api/export')) return 'admin';
  if (path.startsWith('/dashboard')) return 'realtor';
  return 'public';
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const portalRoute = path.slice('/realtor'.length) || '/';
  const area = areaFor(portalRoute);

  let isAdmin = false;
  let isRealtor = false;
  let realtorStatus: string | null = null;
  let realtorEmailVerified = false;

  if (user) {
    const [{ data: admin }, { data: realtor }] = await Promise.all([
      area === 'admin' || portalRoute === '/admin/login'
        ? supabase.from('admins').select('id').eq('id', user.id).maybeSingle()
        : Promise.resolve({ data: null }),
      area === 'realtor' || portalRoute === '/login'
        ? supabase
            .from('users')
            .select('id, status, email_verified_at')
            .eq('auth_id', user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);
    isAdmin = !!admin;
    realtorStatus = realtor?.status ?? null;
    realtorEmailVerified = !!realtor?.email_verified_at;
    isRealtor = realtor?.status === 'active' && !!realtor.email_verified_at;
  }

  if (!user && area !== 'public') {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = portalPath(area === 'admin' ? '/admin/login' : '/login');
    loginUrl.searchParams.set('next', path);
    return NextResponse.redirect(loginUrl);
  }

  if (user && area === 'admin' && !isAdmin) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = portalPath('/admin/login');
    loginUrl.searchParams.set('error', 'not-authorized');
    return NextResponse.redirect(loginUrl);
  }

  if (user && area === 'realtor' && !isRealtor) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = portalPath('/login');
    loginUrl.searchParams.set(
      'error',
      realtorStatus === 'pending' && realtorEmailVerified ? 'approval-pending' : 'not-authorized'
    );
    return NextResponse.redirect(loginUrl);
  }

  // Only skip past a login page if this session actually belongs to that
  // area — otherwise this would loop (e.g. an admin-only session hitting
  // /login would bounce to /dashboard, which would bounce them right back).
  if (user && portalRoute === '/admin/login' && isAdmin) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = portalPath('/admin');
    return NextResponse.redirect(dashboardUrl);
  }

  if (user && portalRoute === '/login' && isRealtor) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = portalPath('/dashboard');
    return NextResponse.redirect(dashboardUrl);
  }

  return supabaseResponse;
}
