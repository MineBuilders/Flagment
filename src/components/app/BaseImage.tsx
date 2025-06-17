import Image, { ImageProps } from 'next/image';

export default function BaseImage(props: ImageProps) {
    const basePath = process.env.NEXT_BASE_PATH || '';
    // eslint-disable-next-line jsx-a11y/alt-text
    return <Image {...props} src={basePath + props.src}/>;
}
