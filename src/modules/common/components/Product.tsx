import { IProduct } from '@/modules/types/product';
import { useRouter } from 'next/navigation';

interface Props {
	product: IProduct;
}

export const ProductCard = (props: Props) => {
	const { product } = props;
	const router = useRouter();

	const hasVariants = product.hasVariants;

	console.log(product, 'has variants', hasVariants);

	const thumbnail = hasVariants
		? product?.variants?.[0]?.thumbnail
		: product?.thumbnail;

	const price = hasVariants ? product?.variants?.[0]?.price : product?.price;
	const discountedPrice = hasVariants
		? product?.variants?.[0]?.discountedPrice
		: product?.discountedPrice;

	return (
		<div className='flex justify-center items-center'>
			<div
				onClick={(e) => router.push(`/product/${product.id}`)}
				className='flex cursor-pointer flex-col gap-4 md:gap-8 w-[10.25rem] sm:w-[15rem] md:w-72 h-full'
			>
				<img
					className='w-[10.25rem] h-[13.5rem] sm:w-[15rem] sm:h-[21rem] md:w-72 md:h-96 object-cover'
					src={thumbnail ?? ''}
					alt='Thumbnail'
				/>
				<div className='flex flex-col gap-2'>
					<div className='font-semibold capitalize text-xs sm:text-base md:text-xl text-[#212121]'>
						{product.name}
					</div>

					{/* {product.category && (
						<div className='text-[#757575] text-base font-semibold'>
							{product.category}
						</div>
					)} */}

					<div className='flex items-center gap-2'>
						{discountedPrice ? (
							<>
								<div className='text-[10px] sm:text-xs md:text-sm line-through font-semibold text-[#616161]'>
									₹{price}
								</div>
								<div className='text-xs sm:text-sm md:text-lg font-semibold text-[#4F1010]'>
									₹{discountedPrice}
								</div>
							</>
						) : (
							<div className=' text-xs md:text-lg font-semibold text-[#4F1010]'>
								₹{price}
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
};
