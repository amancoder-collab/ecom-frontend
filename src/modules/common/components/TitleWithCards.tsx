'use client';
import { IProduct } from '@/modules/types/product';
import { useRouter } from 'next/navigation';
import { ProductCard } from './Product';
import { ProductCardSkeleton } from './ProductCardSkeleton';
import { Title } from './Title';

interface Props {
	text: string;
	items: IProduct[] | null | undefined;
	viewAll?: boolean;
	mainDivClassName?: string;
	isLoading?: boolean;
	link?: string;
}

export const TitleWithCards = (props: Props) => {
	const {
		text,
		items,
		viewAll = false,
		mainDivClassName = '',
		isLoading = false,
		link,
	} = props;

	const router = useRouter();

	return (
		<div className={`flex flex-col w-full items-center ${mainDivClassName}`}>
			<Title text={text} />

			{items && (
				<div className='flex flex-col justify-center items-center mt-8 md:mt-16 md:max-w-[45rem] lg:max-w-[50rem] xl:max-w-[76rem]'>
					<div className='grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-start justify-center gap-x-4 gap-y-8 sm:gap-x-8 sm:gap-y-16 w-full'>
						{isLoading
							? [1, 2, 3, 4].map((index) => <ProductCardSkeleton key={index} />)
							: items.map((product: IProduct) => {
									return <ProductCard product={product} />;
							  })}
					</div>

					{!isLoading && viewAll && (
						<div
							onClick={() => link && router.push(link)}
							className='flex items-center justify-center gap-4 mt-4 sm:mt-12'
						>
							<img
								className='w-4 h-4 md:w-7 md:h-7'
								src='/assets/images/curly-light.svg'
								alt=''
							/>
							<div className='underline text-sm font-semibold text-[#212121]'>
								View All
							</div>
							<img
								className='w-4 h-4 md:w-7 md:h-7'
								src='/assets/images/curly-light.svg'
								alt=''
							/>
						</div>
					)}
				</div>
			)}
		</div>
	);
};
