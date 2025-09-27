import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from 'cedar-os';

const buttonVariants = cva(
	'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all duration-200 transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98]',
	{
		variants: {
			variant: {
				default:
					'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg hover:from-blue-600 hover:to-purple-700 hover:shadow-xl hover:-translate-y-0.5',
				destructive:
					'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-md hover:from-red-600 hover:to-red-700 hover:shadow-lg hover:-translate-y-0.5',
				outline:
					'border-2 border-gray-200 bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white hover:border-gray-300 hover:shadow-md hover:-translate-y-0.5',
				secondary:
					'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 shadow-sm hover:from-gray-100 hover:to-gray-200 hover:shadow-md hover:-translate-y-0.5 border border-gray-200',
				ghost: 'hover:bg-gray-100/80 hover:backdrop-blur-sm',
				link: 'text-primary underline-offset-4 hover:underline hover:text-primary/80',
				glass:
					'bg-white/20 backdrop-blur-md border border-white/30 text-gray-700 shadow-lg hover:bg-white/30 hover:shadow-xl hover:-translate-y-0.5',
				gradient:
					'bg-gradient-to-r from-travel-sunset to-travel-ocean text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5 hover:scale-[1.02]',
			},
			size: {
				default: 'px-4 py-2.5',
				sm: 'h-8 rounded-lg px-3 text-xs',
				lg: 'h-12 rounded-xl px-8 text-base',
				xl: 'h-14 rounded-2xl px-10 text-lg',
				icon: 'h-9 w-9 p-0',
			},
			animation: {
				none: '',
				subtle: 'hover:scale-[1.02]',
				bounce: 'hover:animate-bounce-slow',
				glow: 'shadow-glow hover:shadow-glow',
			},
		},
		defaultVariants: {
			variant: 'default',
			size: 'default',
			animation: 'subtle',
		},
	}
);

export interface ButtonProps
	extends React.ButtonHTMLAttributes<HTMLButtonElement>,
		VariantProps<typeof buttonVariants> {
	asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
	({ className, variant, size, asChild = false, ...props }, ref) => {
		const Comp = asChild ? Slot : 'button';
		return (
			<Comp
				className={cn(buttonVariants({ variant, size, className }))}
				ref={ref}
				{...props}
			/>
		);
	}
);
Button.displayName = 'Button';

export { Button, buttonVariants };
