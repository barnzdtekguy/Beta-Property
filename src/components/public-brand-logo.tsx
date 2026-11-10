import Image from 'next/image';
import Link from 'next/link';

export function PublicBrandLogo() {
  return (
    <Link href="/" aria-label="Beta Property home" className="public-brand-logo">
      <Image
        src="/assets/beta-logo-transparent.png"
        alt=""
        width={1346}
        height={1346}
        priority
      />
    </Link>
  );
}
