import { redirect } from 'next/navigation';

/**
 * Root page — redirect to Checkpoint (the hackathon submission)
 */
export default function Home() {
  redirect('/checkpoint');
}
