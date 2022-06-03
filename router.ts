const home = async () => {
  const file = await Deno.readFile(`./views/index.html`);
  return new Response(file);
}

export {
  home,
}
