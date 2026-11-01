import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function BaseIcon({ children, ...props }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Official Android robot head mark. */
export function AndroidIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m-10.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m10.407-6.02 1.7-2.9452a.3556.3556 0 0 0-.6156-.3556l-1.719 2.9742a10.53 10.53 0 0 0-8.696 0L6.756 6.0206a.3556.3556 0 0 0-.6156.3556l1.7 2.9452C4.679 11.1325 2.931 14.2386 2.706 17.795h18.588c-.225-3.5564-1.974-6.6625-5.41-8.4736" />
    </BaseIcon>
  );
}

/** Official Windows four-pane mark. */
export function WindowsIcon(props: IconProps) {
  return (
    <BaseIcon {...props}>
      <path d="M0 3.449 9.75 2.1v9.451H0Zm10.95-1.349L24 0v11.4H10.95ZM0 12.6h9.75v9.451L0 20.699Zm10.95 0H24V24l-13.05-1.801Z" />
    </BaseIcon>
  );
}

/** ZIP archive box mark. */
export function ZipIcon(props: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z" />
      <path d="M12 22V12" />
      <path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7" />
      <path d="m7.5 4.27 9 5.15" />
    </svg>
  );
}

/** Inline checkmark bullet. */
export function CheckIcon(props: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}
