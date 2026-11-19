import { notFound } from 'next/navigation';
import { repos } from '@/lib/db';
import { listStyles } from '@/lib/dicebear/engine';
import { EventEditor } from './EventEditor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default async function EventEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await repos().events.getById(id);
  if (!event) notFound();

  const styles = listStyles().map(({ name, label }) => ({ name, label }));
  return <EventEditor event={event} styles={styles} />;
}
