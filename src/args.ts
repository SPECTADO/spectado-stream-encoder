// Define an object to hold parsed arguments
export const args: { [key: string]: string } = {};

// Loop through Deno.args and parse key-value pairs
for (let i = 0; i < Deno.args.length; i++) {
  const arg = Deno.args[i];

  // Check if the argument starts with '--'
  if (arg.startsWith("--")) {
    const argKey = arg.slice(2);

    // If the next argument doesn't start with '--', it's the value for this key
    if (i + 1 < Deno.args.length && !Deno.args[i + 1].startsWith("--")) {
      args[argKey] = Deno.args[i + 1];
      i++; // Skip the value in the next iteration
    } else {
      // Otherwise, it's a flag (boolean)
      args[argKey] = "true";
    }
  }
}
