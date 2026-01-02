import { createContext, ParentProps, useContext } from "solid-js";
import { createStore } from "solid-js/store";

type TimeoutId = ReturnType<typeof setTimeout>;

export type ItemCheckerContextValue = {
  isChecked: (id: number) => boolean;
  setChecked: (id: number, timer: TimeoutId) => void;
  setUnchecked: (id: number) => void;
};

const ItemsCheckerContext = createContext<ItemCheckerContextValue>();

export const useItemCheckerContext = () => {
  const context = useContext(ItemsCheckerContext);
  if (!context) {
    throw new Error(
      "useItemCheckerContex must be used withing ItemsCheckerProvider"
    );
  }

  return context;
};

export function ItemsCheckerProvider(props: ParentProps) {
  // eslint-disable-next-line no-undef
  const [timers, setTimers] = createStore<Record<number, NodeJS.Timeout>>({});

  const isChecked = (id: number) => timers[id] !== undefined;

  const setChecked = (id: number, timer: TimeoutId) => {
    const prev = timers[id];
    if (prev) clearTimeout(prev);
    setTimers(id, timer);
  };

  const setUnchecked = (id: number) => {
    const t = timers[id];
    if (t) clearTimeout(t);

    // setting to undefined deletes the key in a store
    setTimers(id, undefined!);
  };

  return (
    <ItemsCheckerContext.Provider
      value={{
        isChecked,
        setChecked,
        setUnchecked,
      }}
    >
      {props.children}
    </ItemsCheckerContext.Provider>
  );
}
