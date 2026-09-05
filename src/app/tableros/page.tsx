'use client';
import { withPageAuthRequired } from '@auth0/nextjs-auth0/client';
import BoardsPanel from '@/components/Boards/BoardsPanel';

export default withPageAuthRequired(function TablerosPage() {
  return <BoardsPanel />;
});
