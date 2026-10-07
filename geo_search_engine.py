"""
╔══════════════════════════════════════════════════════════════════════════╗
║   محرك البحث الجغرافي العكسي — Geo Reverse Search Engine                 ║
║   البحث بكلمات مفتاحية + تصفية وترتيب حسب الدولة ومستوى التطابق         ║
╚══════════════════════════════════════════════════════════════════════════╝
"""

import os
import asyncio
import logging
from datetime import datetime
from telethon import functions, types
from group_country_analyzer import analyze_content_locally, analyze_content_with_groq, COUNTRY_FLAGS

logger = logging.getLogger('GeoSearchEngine')

async def search_telegram_global(client, query, limit=50):
    results = []
    seen = set()
    try:
        res = await client(functions.contacts.SearchRequest(q=query, limit=limit))
        for chat in res.chats:
            if chat.id in seen:
                continue
            seen.add(chat.id)
            results.append({
                'id': chat.id,
                'title': getattr(chat, 'title', ''),
                'username': getattr(chat, 'username', None),
                'url': f"https://t.me/{chat.username}" if getattr(chat, 'username', None) else '',
                'members': getattr(chat, 'participants_count', 0),
                'about': '',
                'megagroup': getattr(chat, 'megagroup', False),
                'broadcast': getattr(chat, 'broadcast', False),
                'verified': getattr(chat, 'verified', False),
            })
    except Exception as e:
        logger.warning(f"contacts.Search failed: {e}")
    return results

async def enrich_channel(client, item, use_ai=False):
    if not item['username']:
        return item
    try:
        entity = await client.get_entity(item['username'])
        full = await client(functions.channels.GetFullChannelRequest(channel=entity))
        item['about'] = full.full_chat.about or ''
        item['members'] = getattr(full.full_chat, 'participants_count', item['members'])

        texts = [item['about']] if item['about'] else []
        async for m in client.iter_messages(entity, limit=20):
            if m.text:
                texts.append(m.text)

        loc = analyze_content_locally(texts)
        item['country'] = loc.get('country')
        item['country_confidence'] = loc.get('confidence', 'منخفضة')
        item['country_evidences'] = loc.get('evidences', [])
        item['flag'] = COUNTRY_FLAGS.get(item['country'], '🌍')

        if use_ai and (not item['country'] or item['country_confidence'] != 'عالية'):
            ai = await analyze_content_with_groq(texts, sample_size=15)
            if ai.get('country'):
                item['country'] = ai['country']
                item['country_confidence'] = ai.get('confidence', 'متوسطة')
                item['flag'] = COUNTRY_FLAGS.get(ai['country'], '🌍')
    except Exception:
        pass
    return item

async def geo_reverse_search(client, query, target_country, max_results=30, min_members=0, use_ai=True, strict=False):
    raw = await search_telegram_global(client, query, limit=max_results * 2)
    if min_members > 0:
        raw = [r for r in raw if r['members'] >= min_members]

    matched = []
    rejected = []

    for item in raw[:max_results]:
        enriched = await enrich_channel(client, item, use_ai=use_ai)
        c = enriched.get('country')
        conf = enriched.get('country_confidence', 'منخفضة')

        if c == target_country:
            enriched['match_score'] = 3 if conf == 'عالية' else 2 if conf == 'متوسطة' else 1
            matched.append(enriched)
        elif not strict and not c:
            enriched['match_score'] = 0
            matched.append(enriched)
        else:
            rejected.append(enriched)
        await asyncio.sleep(0.2)

    matched.sort(key=lambda x: (x.get('match_score', 0), x.get('members', 0)), reverse=True)

    return {
        'success': True,
        'query': query,
        'target_country': target_country,
        'matched_count': len(matched),
        'matched': matched,
        'rejected_count': len(rejected),
    }
