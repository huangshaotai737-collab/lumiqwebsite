import { InviteAcceptance } from '@/features/team/InviteAcceptance';
export default function InvitePage() {
  return (
    <main className="login-page">
      <section className="login-card">
        <h1>接受员工邀请</h1>
        <InviteAcceptance />
      </section>
    </main>
  );
}
