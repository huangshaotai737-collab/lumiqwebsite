import { Children, cloneElement, createElement, isValidElement, type ComponentPropsWithRef, type ReactNode } from "react";

/** Format headings before the first paint; body copy and translation sources stay intact. */
export function headingText(text: string) {
  return text.replace(/[。．]|(?<!\d)\.|\.(?!\d)/gu, " ");
}

function headingChildren(children: ReactNode): ReactNode {
  return Children.map(children, child => {
    if (typeof child === "string") return headingText(child);
    if (isValidElement<{ children?: ReactNode }>(child) && child.props.children !== undefined) {
      return cloneElement(child, {}, headingChildren(child.props.children));
    }
    return child;
  });
}

type Props = ComponentPropsWithRef<"h2"> & { as: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" };

export default function Heading({ as: Tag, children, ...props }: Props) {
  return createElement(Tag, props, headingChildren(children));
}
