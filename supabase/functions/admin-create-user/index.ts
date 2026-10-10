// admin-create-user — 后台新建用户（仅主管理员 57502460@qq.com 可调用）。
// 用 SERVICE_ROLE 直接 createUser，设置 email_confirm=true（无需邮件验证即可登录）。
// 前端在创建成功后自行调用 savePermissions 授予功能。

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

function json(o: any, status = 200) {
  return new Response(JSON.stringify(o), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

Deno.serve(async (req: Request) => {
  try {
    const authHeader = req.headers.get('Authorization') || ''
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: userData, error: ue } = await supabase.auth.getUser()
    if (ue || !userData.user) return json({ error: 'unauthorized' }, 401)
    if (userData.user.email !== '57502460@qq.com') return json({ error: 'forbidden' }, 403)

    const body = await req.json().catch(() => ({}))
    const email = (body.email || '').trim()
    const password = body.password || ''
    if (!EMAIL_RE.test(email)) return json({ error: 'invalid email' }, 400)
    if (!password || password.length < 6) return json({ error: 'password too short (>=6)' }, 400)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 重复检查（避免 supabase 返回含糊的 409 时前端难以提示）
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const found = (list?.users || []).find((u: any) => u.email === email)
    if (found) return json({ error: 'user already exists' }, 409)

    const { data: created, error: ce } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (ce) return json({ error: ce.message }, 500)
    if (!created?.user) return json({ error: 'create failed' }, 500)

    return json({ ok: true, email, id: created.user.id })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
