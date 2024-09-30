'use client';
import { IProduct } from '@/app/utils/types';
import { Title } from './Title';
import { ProductCard } from './Product';

interface Props {
	text: string;
	items: IProduct[];
	viewAll?: boolean;
}

export const TitleWithCards = (props: Props) => {
	const { text, items, viewAll = false } = props;

	return (
		<div className='flex flex-col'>
			<Title text={text} />
			<div className='flex flex-col justify-center items-center mt-16 px-14'>
				<div className='grid grid-cols-4 max-xl:grid-cols-3 max-lg:grid-cols-2 items-center justify-center gap-x-16 gap-y-20 w-full max-w-[1383px]'>
					{items.map((e) => {
						return <ProductCard item={e} />;
					})}
				</div>

				{viewAll && (
					<div className='flex gap-4 mt-12'>
						<img src='/assets/images/curly-light.svg' alt='' />
						<div className='underline text-sm font-semibold text-[#212121]'>
							View All
						</div>
						<img src='/assets/images/curly-light.svg' alt='' />
					</div>
				)}
			</div>
		</div>
	);
};
