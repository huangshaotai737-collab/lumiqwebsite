'use client';
import {useContentAdapter} from '@/components/content/useContentAdapter';
import Heading from '@/components/Heading';
import Image from '@/components/content/ContentImage';
import {useAccountIdentity} from '@/features/account/use-account-identity';
import {useState} from 'react';
import {Link} from '@/i18n/navigation';
import {Tablet, UserRound, ShieldCheck, ChevronRight, ArrowUpRight} from 'lucide-react';
import {AccountPanel} from '@/features/account/AccountPanel';
import {accountCopy} from '@/features/account/copy';
import type {ApiResult, Locale, Profile} from '@/lib/generated/platform/core';

export default function MembersArea({locale, profile}: {locale:Locale; profile:ApiResult<Profile>}) {
  const cms = useContentAdapter();
  const t = accountCopy[locale];
  const [section, setSection] = useState<'profile' | 'devices'>('profile');
  const identity = useAccountIdentity();
  const savedProfile:ApiResult<Profile> = identity.profile ? {ok:true,data:identity.profile} : {ok:false,error:'UNAUTHENTICATED',requestId:'identity-check'};
  void profile;
  const devices = [
    {id:'ola', name:cms.text("field_8bec1f33f31dd9ab"), image:cms.url("/assets/web/ola-hero-front.webp")},
    {id:'tablet', name:cms.text("field_f714cbe4c6f70453"), image:cms.url("/assets/web/lumiq-tablet.webp")},
  ];

  return (
    <main className="members-page" data-member-account>
      <div className="members-shell">
        <header className="members-heading">
          <div>
            <p className="members-eyebrow">LUMIQ · {t.members}</p>
            <Heading as="h1">{t.title}</Heading><p>{t.intro}</p>
          </div>
          <span className="members-preview-badge"><ShieldCheck size={16} aria-hidden/>{t.profile}</span>
        </header>
        <div className="members-layout">
          <nav className="members-sidebar" aria-label={t.members}>
            <div className="members-avatar">
              <span aria-hidden><UserRound/></span>
              <div><strong>{savedProfile.ok ? savedProfile.data.displayName || t.title : t.signIn}</strong><small>{t.profile}</small></div>
            </div>
            {([{id:'profile', icon:UserRound}, {id:'devices', icon:Tablet}] as const).map(({id, icon:Icon}) => (
              <button key={id} type="button" aria-pressed={section === id} onClick={() => setSection(id)}>
                <Icon size={19} aria-hidden/><span>{t[id]}</span><ChevronRight size={15} aria-hidden/>
              </button>
            ))}
            <Link href="/faq" className="members-help">{t.help}<ArrowUpRight size={16} aria-hidden/></Link>
          </nav>
          <section className="members-content" aria-labelledby="members-section-title">
            <div className="members-section-head"><Heading as="h2" id="members-section-title">{t[section]}</Heading></div>
            {section === 'profile' ? (
              <AccountPanel key={`${identity.generation}:${identity.profile?.userId || 'unknown'}`} locale={locale} initial={savedProfile} generation={identity.generation} isCurrent={identity.current} onInvalidIdentity={identity.invalidate} onProfileSaved={data => identity.save(data,identity.generation)}/>
            ) : (
              <>
                <aside className="members-disclosure">{t.notConnected}</aside>
                <div className="members-device-grid">
                  {devices.map(device => (
                    <article className="members-device" key={device.id}>
                      <div className="members-device-image">
                        <Image src={device.image} alt={device.name} width={300} height={300} sizes="(max-width: 700px) 60vw, 240px"/>
                      </div>
                      <div className="members-device-copy"><Heading as="h3">{device.name}</Heading><p>{t.notConnected}</p></div>
                    </article>
                  ))}
                </div>
                <p className="members-hint">{t.noMembership}</p>
                <Link href="/products" className="members-explore">LUMIQ<ArrowUpRight size={19} aria-hidden/></Link>
              </>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
