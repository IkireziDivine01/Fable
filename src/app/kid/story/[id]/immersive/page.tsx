'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';

/** Legacy route — kid stories now open immersive by default */
export default function KidImmersiveRedirectPage() {
  const params = useParams();
  const router = useRouter();
  const storyId = String(params.id ?? '');

  useEffect(() => {
    if (storyId) router.replace(`/kid/story/${storyId}`);
  }, [router, storyId]);

  return null;
}
