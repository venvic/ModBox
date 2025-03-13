import React from 'react';
import SlugController from '@/components/live/slugController';

export default async function Page({
    params,
}: {
    params: Promise<{ slug: string, moduleId: string }>
}) {
    const { slug, moduleId } = await params;
    return <SlugController slug={slug} moduleId={moduleId} />;
}