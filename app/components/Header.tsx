import { Component1Icon } from "@radix-ui/react-icons";
import { Heading, Button } from "@radix-ui/themes";
import React, { useState } from "react";

type HeaderProps = {
  computeRecipes: () => void;
  loading: boolean;
};
const Header = ({ computeRecipes, loading }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-10 bg-white px-6 py-4 flex justify-between border-b">
      <Heading className="font-eduCursive text-2xl font-semibold text-gray-800">
        Fridge-to-Meal Planner
      </Heading>
      <div className="flex gap-2">
        <Button
          radius="full"
          size="3"
          color="green"
          onClick={computeRecipes}
          aria-busy={loading}
        >
          <Component1Icon />
          {loading ? "Running..." : "Compute Pairs & Recipes"}
        </Button>
      </div>
    </header>
  );
};

export default Header;
