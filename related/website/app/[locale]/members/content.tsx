import MembersArea from '@/components/MembersArea';
import {getOwnProfile} from '@/features/account/service';
import {siteRequestLocale} from '@/components/content/SiteContentBoundary';
import './members.css';
export default async function MembersPage(){return <MembersArea locale={await siteRequestLocale()} profile={await getOwnProfile()}/>;}
