import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

type SearchInputProps = Omit<React.ComponentProps<"input">, "type"> & {
  wrapperClassName?: string;
  iconClassName?: string;
  iconSize?: number;
  endAdornment?: React.ReactNode;
};

/**
 * Physical-left search affordance for RTL and LTR screens. The global search
 * contract in globals.css protects legacy search fields too, while this is the
 * reusable primitive for all new and refactored fields.
 */
const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    {
      wrapperClassName,
      iconClassName,
      iconSize = 16,
      endAdornment,
      className,
      dir = "auto",
      ...props
    },
    ref
  ) {
    return (
      <div className={cn("rek-search-field", wrapperClassName)}>
        <Search
          size={iconSize}
          aria-hidden
          className={cn("rek-search-field__icon", iconClassName)}
        />
        <input
          {...props}
          ref={ref}
          type="search"
          dir={dir}
          data-rek-search-input
          className={cn("rek-search-field__input", className)}
        />
        {endAdornment ? (
          <div className="rek-search-field__end">{endAdornment}</div>
        ) : null}
      </div>
    );
  }
);

export { SearchInput };
