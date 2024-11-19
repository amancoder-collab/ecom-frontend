import { api } from '@/api';
import { IApiError } from '@/api/types';
import { useSession } from '@/modules/auth/queries/use-session';
import { isClient } from '@/modules/lib/utils';
import {
	IAddItemToCart,
	ICart,
	ICartAddress,
	ICartItem,
} from '@/modules/types/cart';
import { RootState } from '@/store';
import { setShippingCharges } from '@/store/slices/cartSlice';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { debounce } from 'lodash';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { useCart } from './use-cart';

const LOCAL_STORAGE_CART_KEY = 'guestCart';

export const useCartManager = () => {
	const { user } = useSession();
	const queryClient = useQueryClient();
	const dispatch = useDispatch();
	const { cart, queryKey, isCartLoading } = useCart(user?.id);
	const [isInitialized, setIsInitialized] = useState(false);

	const charges = useSelector((state: RootState) => state.cart.shippingCharges);

	useEffect(() => {
		const syncGuestCartWithUserCart = async () => {
			if (user?.id && cart?.id) {
				const guestCart = getGuestCart();
				const promises = guestCart?.cartItems?.map(async (item) => {
					return await api.cart.addItemToCart(cart?.id as string, {
						quantity: item?.quantity,
						productId: item?.productId as string,
						variantId: item?.variantId as string,
					});
				});
				const results = await Promise.all(promises);
				console.log('results logs 33333333', results);

				queryClient.invalidateQueries({
					queryKey,
				});

				localStorage.removeItem(LOCAL_STORAGE_CART_KEY);
			}
		};

		if (user?.id && cart?.id && getGuestCart()?.cartItems?.length > 0) {
			syncGuestCartWithUserCart();
		}
	}, [user, cart, queryClient, queryKey]);

	const createCartMutation = useMutation({
		mutationFn: () => api.cart.create({}),
		onSuccess: (response) => {
			queryClient.setQueryData(queryKey, () => {
				return response?.data?.data;
			});

			setIsInitialized(true);
		},
	});

	const validatePincodeMutation = useMutation({
		mutationFn: (pincode: number) => api.shipping.validatePincode(pincode),
	});

	const validatePincode = useCallback(
		async (pincode: number) => {
			if (pincode) {
				try {
					const validationResponse = await validatePincodeMutation.mutateAsync(
						pincode
					);

					if (validationResponse?.data?.data?.isValid) {
						return {
							isValid: true,
							city: validationResponse?.data?.data?.city,
							state: validationResponse?.data?.data?.state,
						};
					} else {
						return { isValid: false, error: 'Invalid pincode' };
					}
				} catch (error) {
					console.error('Error validating pincode:', error);
					return { isValid: false, error: 'Error validating pincode' };
				}
			}
			return { isValid: false, error: 'Pincode is required' };
		},
		[dispatch, cart]
	);

	const deleteMutation = useMutation({
		mutationFn: (lineId: string) => {
			return api.cart.removeItemFromCart(cart?.id as string, lineId);
		},
		onSuccess: (response) => {
			toast.success('Item deleted successfully');
			queryClient.invalidateQueries({ queryKey });
			if (cart?.shippingAddress?.pincode) {
				getShippingCharges(cart?.shippingAddress?.pincode as number);
			}
		},
	});

	const getShippingCharges = useCallback(
		async (pincode?: number) => {
			try {
				if (pincode) {
					const response = await api.shipping.getCharges(cart?.id as string, {
						cod: 0,
						delivery_postcode: pincode,
					});

					dispatch(
						setShippingCharges({
							shippingCost: response?.data?.data?.shippingCost ?? 0,
							codCharges: response?.data?.data?.codCharges ?? 0,
							estimatedDeliveryDate:
								response?.data?.data?.estimatedDeliveryDate ?? '',
							subTotal: response?.data?.data?.subTotal ?? 0,
							totalCost: response?.data?.data?.totalCost ?? 0,
						})
					);
				}
			} catch (error) {
				console.error('Error in shipping debounced logs 9999', error);
			}
		},
		[cart, dispatch]
	);

	const debouncedGetShippingCharges = useCallback(
		debounce((pincode?: number) => {
			getShippingCharges(pincode);
		}, 500),
		[getShippingCharges]
	);

	useEffect(() => {
		if (user?.id && !charges) {
			debouncedGetShippingCharges(cart?.shippingAddress?.pincode as number);
		}

		return () => {
			debouncedGetShippingCharges.cancel();
		};
	}, [
		user?.id,
		charges,
		cart?.shippingAddress?.pincode,
		debouncedGetShippingCharges,
	]);

	const updateCartAddressMutation = useMutation({
		mutationFn: (data: ICartAddress) =>
			api.cart.updateAddress(cart?.id as string, data),
		onSuccess: (_, variables) => {
			toast.success('Cart Address updated successfully.');
			queryClient.invalidateQueries({
				queryKey,
			});
		},
		onError: (error: IApiError) => {
			if (error.response?.data.message) {
				toast.error(error.response.data.message);
			}
		},
	});

	const getGuestCart = (): ICart => {
		if (!isClient()) {
			return { cartItems: [], totalItems: 0 } as any;
		}
		const storedCart = localStorage.getItem(LOCAL_STORAGE_CART_KEY);
		return storedCart
			? JSON.parse(storedCart)
			: { cartItems: [], totalItems: 0 };
	};

	const saveGuestCart = (cart: ICart) => {
		calculateSubTotal(cart);
		localStorage.setItem(LOCAL_STORAGE_CART_KEY, JSON.stringify(cart));
		queryClient.invalidateQueries({ queryKey });
	};

	const calculateSubTotal = (cart: ICart) => {
		console.log('cart in subtotal logs 33333333', cart);

		const subTotal = cart?.cartItems?.reduce(
			(acc, item) =>
				acc + (item?.product?.discountedPrice ?? 0) * item?.quantity,
			0
		);

		console.log('logs 33333333 subtotal', subTotal);

		const newShippingCharges = {
			shippingCost: 0,
			codCharges: 0,
			estimatedDeliveryDate: '',
			subTotal: subTotal ?? 0,
			totalCost: subTotal ?? 0,
		};

		dispatch(setShippingCharges(newShippingCharges));

		return cart;
	};

	const updateCartItemQuantityMutation = useMutation({
		mutationFn: (data: { lineId: string; quantity: number }) => {
			return api.cart.updateCartItemQuantityById(
				cart?.id as string,
				data.lineId,
				data.quantity
			);
		},
		onSuccess: (response) => {
			toast.success('Quantity updated successfully');
			console.log('queryKey', queryKey);
			console.log('cart in update quantity logs 9999', cart);
			if (cart?.shippingAddress?.pincode) {
				getShippingCharges(cart?.shippingAddress?.pincode as number);
			}
			queryClient.invalidateQueries({ queryKey });
		},
	});

	const updateCartItemQuantity = useCallback(
		async ({ lineId, quantity }: { lineId: string; quantity: number }) => {
			if (user?.id) {
				await updateCartItemQuantityMutation.mutateAsync({
					lineId,
					quantity,
				});
			} else {
				const guestCart = getGuestCart();
				const item = guestCart.cartItems.find((item) => item?.id === lineId);
				if (item) {
					item.quantity = quantity;
					saveGuestCart(guestCart);
				}
			}
			toast.success('Quantity updated successfully');
		},
		[user]
	);

	const removeCartItem = async (itemId: string) => {
		if (user) {
			await deleteMutation.mutateAsync(itemId);
		} else {
			const guestCart = getGuestCart();
			guestCart.cartItems = guestCart.cartItems.filter(
				(item) => item?.id !== itemId
			);
			saveGuestCart(guestCart);
			toast.success('Item removed successfully');
		}
	};

	const addItemToCartMutation = useMutation({
		mutationFn: (data: IAddItemToCart) =>
			api.cart.addItemToCart(cart?.id as string, data),
		onSuccess: (response) => {
			toast.success('Product added to cart successfully');
			queryClient.invalidateQueries({
				queryKey,
			});
			if (cart?.shippingAddress?.pincode) {
				getShippingCharges(cart?.shippingAddress?.pincode as number);
			}
		},
		onError: (error: IApiError) => {
			toast.error(
				error?.response?.data?.message || 'Failed to add item to basket'
			);
		},
	});

	const addItemToCart = useRef(
		async ({ productId, quantity, variantId }: IAddItemToCart) => {
			if (user) {
				await addItemToCartMutation.mutateAsync({
					quantity,
					productId,
					variantId,
				});
			} else {
				const guestCart = getGuestCart();

				const lineItem: ICartItem = {
					id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
					productId,
					variantId,
					quantity,
					cartId: guestCart.id,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				};

				const existingItem = guestCart?.cartItems?.find(
					(item) => item?.productId === productId
				);

				if (existingItem) {
					existingItem.quantity += quantity;
					if (existingItem.quantity > 10) {
						existingItem.quantity = 10;
					}
				} else if (!existingItem) {
					lineItem.quantity = quantity;
					guestCart?.cartItems?.push(lineItem as unknown as ICartItem);
				}
				saveGuestCart(guestCart);
				toast.success('Item added to cart successfully');
			}
		}
	).current;

	const initializeCart = async () => {
		await createCartMutation.mutateAsync();
	};

	useEffect(() => {
		if (
			user?.id &&
			!isCartLoading &&
			!cart?.id &&
			!createCartMutation.isPending &&
			!isInitialized
		) {
			initializeCart();
		}
	}, [user, isCartLoading, cart, createCartMutation, isInitialized]);

	return {
		cart,
		addItemToCart,
		updateCartItemQuantity,
		removeCartItem,
		validatePincode,
		getShippingCharges,
		updateCartAddressMutation,
	};
};
