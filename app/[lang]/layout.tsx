// app/[lang]/layout.tsx
import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { ReactNode } from 'react';

import { getTranslations } from '@/lib/get-translations';
import { TranslationProvider } from '@/lib/translation-context';
import { isLangSupported } from '@/lib/i18n-config';
import LanguageSwitcher from '@/components/LanguageSwitcher';

type Props = {
  children: ReactNode;
  params: { lang: string };
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;

  if (!isLangSupported(lang)) {
    return {
      title: 'Language not supported',
      description: '',
    };
  }

  const meta = await getTranslations<{ title?: string; description?: string }>(
    lang,
    'meta'
  );

  return {
    title: meta.title ?? 'Default title',
    description: meta.description ?? 'Default description',
  };
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  if (!isLangSupported(lang)) {
    notFound();
  }

  const uiMessages = await getTranslations<Record<string, string>>(lang, 'ui');

  return (
    <html lang={lang}>
      <body>
        <header>
          <LanguageSwitcher />
        </header>
        <TranslationProvider lang={lang} messages={uiMessages}>
          {children}
        </TranslationProvider>
      </body>
    </html>
  );
}
