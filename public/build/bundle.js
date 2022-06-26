
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
(function () {
    'use strict';

    function noop() { }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function set_store_value(store, ret, value) {
        store.set(value);
        return ret;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element$1(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        if (value === null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function select_option(select, value) {
        for (let i = 0; i < select.options.length; i += 1) {
            const option = select.options[i];
            if (option.__value === value) {
                option.selected = true;
                return;
            }
        }
        select.selectedIndex = -1; // no option should be selected
    }
    function select_value(select) {
        const selected_option = select.querySelector(':checked') || select.options[0];
        return selected_option && selected_option.__value;
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false }) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            // @ts-ignore
            callbacks.slice().forEach(fn => fn.call(this, event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                if (info.blocks[i] === block) {
                                    info.blocks[i] = null;
                                }
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
                if (!info.hasCatch) {
                    throw error;
                }
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }
    function update_await_block_branch(info, ctx, dirty) {
        const child_ctx = ctx.slice();
        const { resolved } = info;
        if (info.current === info.then) {
            child_ctx[info.value] = resolved;
        }
        if (info.current === info.catch) {
            child_ctx[info.error] = resolved;
        }
        info.block.p(child_ctx, dirty);
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.48.0' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/Header.svelte generated by Svelte v3.48.0 */

    const file$d = "src/Header.svelte";

    function create_fragment$d(ctx) {
    	let header;
    	let h1;

    	const block = {
    		c: function create() {
    			header = element$1("header");
    			h1 = element$1("h1");
    			h1.textContent = "DECIN";
    			attr_dev(h1, "class", "svelte-1afgr04");
    			add_location(h1, file$d, 1, 2, 11);
    			attr_dev(header, "class", "svelte-1afgr04");
    			add_location(header, file$d, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			append_dev(header, h1);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$d.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$d($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Header', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Header> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Header extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$d, create_fragment$d, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Header",
    			options,
    			id: create_fragment$d.name
    		});
    	}
    }

    /* src/Nav.svelte generated by Svelte v3.48.0 */

    const file$c = "src/Nav.svelte";

    function create_fragment$c(ctx) {
    	let nav;
    	let ul;
    	let li0;
    	let a0;
    	let t1;
    	let li1;
    	let a1;
    	let t3;
    	let li2;
    	let a2;

    	const block = {
    		c: function create() {
    			nav = element$1("nav");
    			ul = element$1("ul");
    			li0 = element$1("li");
    			a0 = element$1("a");
    			a0.textContent = "Home";
    			t1 = space();
    			li1 = element$1("li");
    			a1 = element$1("a");
    			a1.textContent = "Services";
    			t3 = space();
    			li2 = element$1("li");
    			a2 = element$1("a");
    			a2.textContent = "About";
    			attr_dev(a0, "href", "/");
    			attr_dev(a0, "class", "svelte-1aud89e");
    			add_location(a0, file$c, 2, 8, 21);
    			attr_dev(li0, "class", "svelte-1aud89e");
    			add_location(li0, file$c, 2, 4, 17);
    			attr_dev(a1, "href", "/services");
    			attr_dev(a1, "class", "svelte-1aud89e");
    			add_location(a1, file$c, 3, 8, 55);
    			attr_dev(li1, "class", "svelte-1aud89e");
    			add_location(li1, file$c, 3, 4, 51);
    			attr_dev(a2, "href", "/about");
    			attr_dev(a2, "class", "svelte-1aud89e");
    			add_location(a2, file$c, 4, 8, 101);
    			attr_dev(li2, "class", "svelte-1aud89e");
    			add_location(li2, file$c, 4, 4, 97);
    			attr_dev(ul, "class", "svelte-1aud89e");
    			add_location(ul, file$c, 1, 2, 8);
    			attr_dev(nav, "class", "svelte-1aud89e");
    			add_location(nav, file$c, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, ul);
    			append_dev(ul, li0);
    			append_dev(li0, a0);
    			append_dev(ul, t1);
    			append_dev(ul, li1);
    			append_dev(li1, a1);
    			append_dev(ul, t3);
    			append_dev(ul, li2);
    			append_dev(li2, a2);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Nav', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Nav> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Nav extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Nav",
    			options,
    			id: create_fragment$c.name
    		});
    	}
    }

    /* src/Button.svelte generated by Svelte v3.48.0 */

    const file$b = "src/Button.svelte";

    function create_fragment$b(ctx) {
    	let button;
    	let img;
    	let img_src_value;
    	let button_style_value;
    	let style_top = `${/*lr*/ ctx[4]}em`;
    	let style_width = `${/*size*/ ctx[3]}em`;
    	let style_height = `${/*size*/ ctx[3]}em`;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			button = element$1("button");
    			img = element$1("img");
    			if (!src_url_equal(img.src, img_src_value = "/" + /*ctx*/ ctx[1] + ".png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", /*ctx*/ ctx[1]);
    			attr_dev(img, "class", "svelte-114kkdu");
    			add_location(img, file$b, 14, 1, 278);
    			attr_dev(button, "style", button_style_value = "" + (/*drn*/ ctx[0] + ":" + /*lr*/ ctx[4] + "em"));
    			attr_dev(button, "class", "svelte-114kkdu");
    			set_style(button, "top", style_top, false);
    			set_style(button, "width", style_width, false);
    			set_style(button, "height", style_height, false);
    			set_style(button, "position", /*pos*/ ctx[2], false);
    			add_location(button, file$b, 7, 0, 146);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, img);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[5], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*ctx*/ 2 && !src_url_equal(img.src, img_src_value = "/" + /*ctx*/ ctx[1] + ".png")) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (dirty & /*ctx*/ 2) {
    				attr_dev(img, "alt", /*ctx*/ ctx[1]);
    			}

    			if (dirty & /*drn, lr*/ 17 && button_style_value !== (button_style_value = "" + (/*drn*/ ctx[0] + ":" + /*lr*/ ctx[4] + "em"))) {
    				attr_dev(button, "style", button_style_value);
    			}

    			if (dirty & /*lr*/ 16 && style_top !== (style_top = `${/*lr*/ ctx[4]}em`)) {
    				set_style(button, "top", style_top, false);
    			}

    			if (dirty & /*size*/ 8 && style_width !== (style_width = `${/*size*/ ctx[3]}em`)) {
    				set_style(button, "width", style_width, false);
    			}

    			if (dirty & /*size*/ 8 && style_height !== (style_height = `${/*size*/ ctx[3]}em`)) {
    				set_style(button, "height", style_height, false);
    			}

    			if (dirty & /*pos*/ 4) {
    				set_style(button, "position", /*pos*/ ctx[2], false);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Button', slots, []);
    	let { drn = 'left' } = $$props;
    	let { ctx = 'less' } = $$props;
    	let { pos = 'none' } = $$props;
    	let { size = 4 } = $$props;
    	let { lr = 0.2 } = $$props;
    	const writable_props = ['drn', 'ctx', 'pos', 'size', 'lr'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Button> was created with unknown prop '${key}'`);
    	});

    	function click_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	$$self.$$set = $$props => {
    		if ('drn' in $$props) $$invalidate(0, drn = $$props.drn);
    		if ('ctx' in $$props) $$invalidate(1, ctx = $$props.ctx);
    		if ('pos' in $$props) $$invalidate(2, pos = $$props.pos);
    		if ('size' in $$props) $$invalidate(3, size = $$props.size);
    		if ('lr' in $$props) $$invalidate(4, lr = $$props.lr);
    	};

    	$$self.$capture_state = () => ({ drn, ctx, pos, size, lr });

    	$$self.$inject_state = $$props => {
    		if ('drn' in $$props) $$invalidate(0, drn = $$props.drn);
    		if ('ctx' in $$props) $$invalidate(1, ctx = $$props.ctx);
    		if ('pos' in $$props) $$invalidate(2, pos = $$props.pos);
    		if ('size' in $$props) $$invalidate(3, size = $$props.size);
    		if ('lr' in $$props) $$invalidate(4, lr = $$props.lr);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [drn, ctx, pos, size, lr, click_handler];
    }

    class Button extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, { drn: 0, ctx: 1, pos: 2, size: 3, lr: 4 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Button",
    			options,
    			id: create_fragment$b.name
    		});
    	}

    	get drn() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set drn(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get ctx() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ctx(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pos() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pos(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get size() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set size(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get lr() {
    		throw new Error("<Button>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set lr(value) {
    		throw new Error("<Button>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/ProductsBox.svelte generated by Svelte v3.48.0 */
    const file$a = "src/ProductsBox.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[6] = list[i].name;
    	child_ctx[7] = list[i].src;
    	child_ctx[8] = list[i].price;
    	child_ctx[9] = list[i].mounth;
    	child_ctx[10] = list;
    	child_ctx[11] = i;
    	return child_ctx;
    }

    // (1:0) <script lang='ts'>import Button from './Button.svelte'; const dataProduct = async () => {     const dates = await fetch('https://apideno.deno.dev/');     const data = await dates.json();     return data; }
    function create_catch_block(ctx) {
    	const block = {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(1:0) <script lang='ts'>import Button from './Button.svelte'; const dataProduct = async () => {     const dates = await fetch('https://apideno.deno.dev/');     const data = await dates.json();     return data; }",
    		ctx
    	});

    	return block;
    }

    // (10:27)    {#each value as {name, src, price, mounth}}
    function create_then_block(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = /*value*/ ctx[5];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*promise*/ 1) {
    				each_value = /*value*/ ctx[5];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(10:27)    {#each value as {name, src, price, mounth}}",
    		ctx
    	});

    	return block;
    }

    // (11:2) {#each value as {name, src, price, mounth}}
    function create_each_block(ctx) {
    	let div2;
    	let h2;
    	let t0_value = /*name*/ ctx[6] + "";
    	let t0;
    	let t1;
    	let div0;
    	let button0;
    	let t2;
    	let button1;
    	let t3;
    	let img;
    	let img_src_value;
    	let img_alt_value;
    	let t4;
    	let div1;
    	let span1;
    	let t5;
    	let span0;
    	let t6_value = /*price*/ ctx[8] + "";
    	let t6;
    	let t7;
    	let span3;
    	let t8;
    	let span2;
    	let t9_value = /*mounth*/ ctx[9] + "";
    	let t9;
    	let t10;
    	let current;
    	let mounted;
    	let dispose;

    	function click_handler_1() {
    		return /*click_handler_1*/ ctx[2](/*mounth*/ ctx[9], /*each_value*/ ctx[10], /*each_index*/ ctx[11], /*price*/ ctx[8]);
    	}

    	button0 = new Button({
    			props: {
    				drn: "right",
    				pos: "absolute",
    				ctx: "plus"
    			},
    			$$inline: true
    		});

    	button0.$on("click", click_handler_1);

    	function click_handler_2() {
    		return /*click_handler_2*/ ctx[3](/*mounth*/ ctx[9], /*each_value*/ ctx[10], /*each_index*/ ctx[11], /*price*/ ctx[8]);
    	}

    	button1 = new Button({
    			props: { pos: "absolute", ctx: "less" },
    			$$inline: true
    		});

    	button1.$on("click", click_handler_2);

    	const block = {
    		c: function create() {
    			div2 = element$1("div");
    			h2 = element$1("h2");
    			t0 = text(t0_value);
    			t1 = space();
    			div0 = element$1("div");
    			create_component(button0.$$.fragment);
    			t2 = space();
    			create_component(button1.$$.fragment);
    			t3 = space();
    			img = element$1("img");
    			t4 = space();
    			div1 = element$1("div");
    			span1 = element$1("span");
    			t5 = text("Price: ");
    			span0 = element$1("span");
    			t6 = text(t6_value);
    			t7 = space();
    			span3 = element$1("span");
    			t8 = text("Mounth: ");
    			span2 = element$1("span");
    			t9 = text(t9_value);
    			t10 = space();
    			attr_dev(h2, "class", "svelte-b6riyl");
    			add_location(h2, file$a, 12, 6, 357);
    			if (!src_url_equal(img.src, img_src_value = /*src*/ ctx[7])) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", img_alt_value = /*name*/ ctx[6]);
    			attr_dev(img, "class", "svelte-b6riyl");
    			add_location(img, file$a, 24, 8, 734);
    			attr_dev(div0, "class", "box-product svelte-b6riyl");
    			add_location(div0, file$a, 13, 6, 379);
    			attr_dev(span0, "class", "svelte-b6riyl");
    			set_style(span0, "font-size", `1.6rem`, false);
    			add_location(span0, file$a, 27, 21, 833);
    			attr_dev(span1, "class", "svelte-b6riyl");
    			add_location(span1, file$a, 27, 8, 820);
    			attr_dev(span2, "class", "svelte-b6riyl");
    			set_style(span2, "font-size", `1.6rem`, false);
    			add_location(span2, file$a, 28, 22, 906);
    			attr_dev(span3, "class", "svelte-b6riyl");
    			add_location(span3, file$a, 28, 8, 892);
    			attr_dev(div1, "class", "box-info svelte-b6riyl");
    			add_location(div1, file$a, 26, 6, 789);
    			attr_dev(div2, "class", "box-service svelte-b6riyl");
    			add_location(div2, file$a, 11, 4, 325);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, h2);
    			append_dev(h2, t0);
    			append_dev(div2, t1);
    			append_dev(div2, div0);
    			mount_component(button0, div0, null);
    			append_dev(div0, t2);
    			mount_component(button1, div0, null);
    			append_dev(div0, t3);
    			append_dev(div0, img);
    			append_dev(div2, t4);
    			append_dev(div2, div1);
    			append_dev(div1, span1);
    			append_dev(span1, t5);
    			append_dev(span1, span0);
    			append_dev(span0, t6);
    			append_dev(div1, t7);
    			append_dev(div1, span3);
    			append_dev(span3, t8);
    			append_dev(span3, span2);
    			append_dev(span2, t9);
    			append_dev(div2, t10);
    			current = true;

    			if (!mounted) {
    				dispose = listen_dev(img, "click", /*click_handler*/ ctx[1], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			if ((!current || dirty & /*promise*/ 1) && t0_value !== (t0_value = /*name*/ ctx[6] + "")) set_data_dev(t0, t0_value);

    			if (!current || dirty & /*promise*/ 1 && !src_url_equal(img.src, img_src_value = /*src*/ ctx[7])) {
    				attr_dev(img, "src", img_src_value);
    			}

    			if (!current || dirty & /*promise*/ 1 && img_alt_value !== (img_alt_value = /*name*/ ctx[6])) {
    				attr_dev(img, "alt", img_alt_value);
    			}

    			if ((!current || dirty & /*promise*/ 1) && t6_value !== (t6_value = /*price*/ ctx[8] + "")) set_data_dev(t6, t6_value);
    			if ((!current || dirty & /*promise*/ 1) && t9_value !== (t9_value = /*mounth*/ ctx[9] + "")) set_data_dev(t9, t9_value);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button0.$$.fragment, local);
    			transition_in(button1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button0.$$.fragment, local);
    			transition_out(button1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			destroy_component(button0);
    			destroy_component(button1);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(11:2) {#each value as {name, src, price, mounth}}",
    		ctx
    	});

    	return block;
    }

    // (1:0) <script lang='ts'>import Button from './Button.svelte'; const dataProduct = async () => {     const dates = await fetch('https://apideno.deno.dev/');     const data = await dates.json();     return data; }
    function create_pending_block(ctx) {
    	const block = {
    		c: noop,
    		m: noop,
    		p: noop,
    		i: noop,
    		o: noop,
    		d: noop
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(1:0) <script lang='ts'>import Button from './Button.svelte'; const dataProduct = async () => {     const dates = await fetch('https://apideno.deno.dev/');     const data = await dates.json();     return data; }",
    		ctx
    	});

    	return block;
    }

    function create_fragment$a(ctx) {
    	let await_block_anchor;
    	let promise_1;
    	let current;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: false,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: 5,
    		blocks: [,,,]
    	};

    	handle_promise(promise_1 = /*promise*/ ctx[0], info);

    	const block = {
    		c: function create() {
    			await_block_anchor = empty();
    			info.block.c();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, await_block_anchor, anchor);
    			info.block.m(target, info.anchor = anchor);
    			info.mount = () => await_block_anchor.parentNode;
    			info.anchor = await_block_anchor;
    			current = true;
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			info.ctx = ctx;

    			if (dirty & /*promise*/ 1 && promise_1 !== (promise_1 = /*promise*/ ctx[0]) && handle_promise(promise_1, info)) ; else {
    				update_await_block_branch(info, ctx, dirty);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(info.block);
    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < 3; i += 1) {
    				const block = info.blocks[i];
    				transition_out(block);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(await_block_anchor);
    			info.block.d(detaching);
    			info.token = null;
    			info = null;
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ProductsBox', slots, []);

    	const dataProduct = async () => {
    		const dates = await fetch('https://apideno.deno.dev/');
    		const data = await dates.json();
    		return data;
    	};

    	let promise = dataProduct();
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ProductsBox> was created with unknown prop '${key}'`);
    	});

    	function click_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	const click_handler_1 = (mounth, each_value, each_index, price) => {
    		if (mounth < 12) {
    			$$invalidate(0, each_value[each_index].mounth += 1, promise);
    			$$invalidate(0, each_value[each_index].price += 10, promise);
    		}
    	};

    	const click_handler_2 = (mounth, each_value, each_index, price) => {
    		if (mounth > 1) {
    			$$invalidate(0, each_value[each_index].mounth -= 1, promise);
    			$$invalidate(0, each_value[each_index].price -= 10, promise);
    		}
    	};

    	$$self.$capture_state = () => ({ Button, dataProduct, promise });

    	$$self.$inject_state = $$props => {
    		if ('promise' in $$props) $$invalidate(0, promise = $$props.promise);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [promise, click_handler, click_handler_1, click_handler_2];
    }

    class ProductsBox extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ProductsBox",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    // can-promise has a crash in some versions of react native that dont have
    // standard global objects
    // https://github.com/soldair/node-qrcode/issues/157

    var canPromise = function () {
      return typeof Promise === 'function' && Promise.prototype && Promise.prototype.then
    };

    let toSJISFunction;
    const CODEWORDS_COUNT = [
      0, // Not used
      26, 44, 70, 100, 134, 172, 196, 242, 292, 346,
      404, 466, 532, 581, 655, 733, 815, 901, 991, 1085,
      1156, 1258, 1364, 1474, 1588, 1706, 1828, 1921, 2051, 2185,
      2323, 2465, 2611, 2761, 2876, 3034, 3196, 3362, 3532, 3706
    ];

    /**
     * Returns the QR Code size for the specified version
     *
     * @param  {Number} version QR Code version
     * @return {Number}         size of QR code
     */
    var getSymbolSize$1 = function getSymbolSize (version) {
      if (!version) throw new Error('"version" cannot be null or undefined')
      if (version < 1 || version > 40) throw new Error('"version" should be in range from 1 to 40')
      return version * 4 + 17
    };

    /**
     * Returns the total number of codewords used to store data and EC information.
     *
     * @param  {Number} version QR Code version
     * @return {Number}         Data length in bits
     */
    var getSymbolTotalCodewords = function getSymbolTotalCodewords (version) {
      return CODEWORDS_COUNT[version]
    };

    /**
     * Encode data with Bose-Chaudhuri-Hocquenghem
     *
     * @param  {Number} data Value to encode
     * @return {Number}      Encoded value
     */
    var getBCHDigit = function (data) {
      let digit = 0;

      while (data !== 0) {
        digit++;
        data >>>= 1;
      }

      return digit
    };

    var setToSJISFunction = function setToSJISFunction (f) {
      if (typeof f !== 'function') {
        throw new Error('"toSJISFunc" is not a valid function.')
      }

      toSJISFunction = f;
    };

    var isKanjiModeEnabled = function () {
      return typeof toSJISFunction !== 'undefined'
    };

    var toSJIS = function toSJIS (kanji) {
      return toSJISFunction(kanji)
    };

    var utils$1 = {
    	getSymbolSize: getSymbolSize$1,
    	getSymbolTotalCodewords: getSymbolTotalCodewords,
    	getBCHDigit: getBCHDigit,
    	setToSJISFunction: setToSJISFunction,
    	isKanjiModeEnabled: isKanjiModeEnabled,
    	toSJIS: toSJIS
    };

    function createCommonjsModule(fn) {
      var module = { exports: {} };
    	return fn(module, module.exports), module.exports;
    }

    var errorCorrectionLevel = createCommonjsModule(function (module, exports) {
    exports.L = { bit: 1 };
    exports.M = { bit: 0 };
    exports.Q = { bit: 3 };
    exports.H = { bit: 2 };

    function fromString (string) {
      if (typeof string !== 'string') {
        throw new Error('Param is not a string')
      }

      const lcStr = string.toLowerCase();

      switch (lcStr) {
        case 'l':
        case 'low':
          return exports.L

        case 'm':
        case 'medium':
          return exports.M

        case 'q':
        case 'quartile':
          return exports.Q

        case 'h':
        case 'high':
          return exports.H

        default:
          throw new Error('Unknown EC Level: ' + string)
      }
    }

    exports.isValid = function isValid (level) {
      return level && typeof level.bit !== 'undefined' &&
        level.bit >= 0 && level.bit < 4
    };

    exports.from = function from (value, defaultValue) {
      if (exports.isValid(value)) {
        return value
      }

      try {
        return fromString(value)
      } catch (e) {
        return defaultValue
      }
    };
    });

    function BitBuffer () {
      this.buffer = [];
      this.length = 0;
    }

    BitBuffer.prototype = {

      get: function (index) {
        const bufIndex = Math.floor(index / 8);
        return ((this.buffer[bufIndex] >>> (7 - index % 8)) & 1) === 1
      },

      put: function (num, length) {
        for (let i = 0; i < length; i++) {
          this.putBit(((num >>> (length - i - 1)) & 1) === 1);
        }
      },

      getLengthInBits: function () {
        return this.length
      },

      putBit: function (bit) {
        const bufIndex = Math.floor(this.length / 8);
        if (this.buffer.length <= bufIndex) {
          this.buffer.push(0);
        }

        if (bit) {
          this.buffer[bufIndex] |= (0x80 >>> (this.length % 8));
        }

        this.length++;
      }
    };

    var bitBuffer = BitBuffer;

    /**
     * Helper class to handle QR Code symbol modules
     *
     * @param {Number} size Symbol size
     */
    function BitMatrix (size) {
      if (!size || size < 1) {
        throw new Error('BitMatrix size must be defined and greater than 0')
      }

      this.size = size;
      this.data = new Uint8Array(size * size);
      this.reservedBit = new Uint8Array(size * size);
    }

    /**
     * Set bit value at specified location
     * If reserved flag is set, this bit will be ignored during masking process
     *
     * @param {Number}  row
     * @param {Number}  col
     * @param {Boolean} value
     * @param {Boolean} reserved
     */
    BitMatrix.prototype.set = function (row, col, value, reserved) {
      const index = row * this.size + col;
      this.data[index] = value;
      if (reserved) this.reservedBit[index] = true;
    };

    /**
     * Returns bit value at specified location
     *
     * @param  {Number}  row
     * @param  {Number}  col
     * @return {Boolean}
     */
    BitMatrix.prototype.get = function (row, col) {
      return this.data[row * this.size + col]
    };

    /**
     * Applies xor operator at specified location
     * (used during masking process)
     *
     * @param {Number}  row
     * @param {Number}  col
     * @param {Boolean} value
     */
    BitMatrix.prototype.xor = function (row, col, value) {
      this.data[row * this.size + col] ^= value;
    };

    /**
     * Check if bit at specified location is reserved
     *
     * @param {Number}   row
     * @param {Number}   col
     * @return {Boolean}
     */
    BitMatrix.prototype.isReserved = function (row, col) {
      return this.reservedBit[row * this.size + col]
    };

    var bitMatrix = BitMatrix;

    /**
     * Alignment pattern are fixed reference pattern in defined positions
     * in a matrix symbology, which enables the decode software to re-synchronise
     * the coordinate mapping of the image modules in the event of moderate amounts
     * of distortion of the image.
     *
     * Alignment patterns are present only in QR Code symbols of version 2 or larger
     * and their number depends on the symbol version.
     */

    var alignmentPattern = createCommonjsModule(function (module, exports) {
    const getSymbolSize = utils$1.getSymbolSize;

    /**
     * Calculate the row/column coordinates of the center module of each alignment pattern
     * for the specified QR Code version.
     *
     * The alignment patterns are positioned symmetrically on either side of the diagonal
     * running from the top left corner of the symbol to the bottom right corner.
     *
     * Since positions are simmetrical only half of the coordinates are returned.
     * Each item of the array will represent in turn the x and y coordinate.
     * @see {@link getPositions}
     *
     * @param  {Number} version QR Code version
     * @return {Array}          Array of coordinate
     */
    exports.getRowColCoords = function getRowColCoords (version) {
      if (version === 1) return []

      const posCount = Math.floor(version / 7) + 2;
      const size = getSymbolSize(version);
      const intervals = size === 145 ? 26 : Math.ceil((size - 13) / (2 * posCount - 2)) * 2;
      const positions = [size - 7]; // Last coord is always (size - 7)

      for (let i = 1; i < posCount - 1; i++) {
        positions[i] = positions[i - 1] - intervals;
      }

      positions.push(6); // First coord is always 6

      return positions.reverse()
    };

    /**
     * Returns an array containing the positions of each alignment pattern.
     * Each array's element represent the center point of the pattern as (x, y) coordinates
     *
     * Coordinates are calculated expanding the row/column coordinates returned by {@link getRowColCoords}
     * and filtering out the items that overlaps with finder pattern
     *
     * @example
     * For a Version 7 symbol {@link getRowColCoords} returns values 6, 22 and 38.
     * The alignment patterns, therefore, are to be centered on (row, column)
     * positions (6,22), (22,6), (22,22), (22,38), (38,22), (38,38).
     * Note that the coordinates (6,6), (6,38), (38,6) are occupied by finder patterns
     * and are not therefore used for alignment patterns.
     *
     * let pos = getPositions(7)
     * // [[6,22], [22,6], [22,22], [22,38], [38,22], [38,38]]
     *
     * @param  {Number} version QR Code version
     * @return {Array}          Array of coordinates
     */
    exports.getPositions = function getPositions (version) {
      const coords = [];
      const pos = exports.getRowColCoords(version);
      const posLength = pos.length;

      for (let i = 0; i < posLength; i++) {
        for (let j = 0; j < posLength; j++) {
          // Skip if position is occupied by finder patterns
          if ((i === 0 && j === 0) || // top-left
              (i === 0 && j === posLength - 1) || // bottom-left
              (i === posLength - 1 && j === 0)) { // top-right
            continue
          }

          coords.push([pos[i], pos[j]]);
        }
      }

      return coords
    };
    });

    const getSymbolSize = utils$1.getSymbolSize;
    const FINDER_PATTERN_SIZE = 7;

    /**
     * Returns an array containing the positions of each finder pattern.
     * Each array's element represent the top-left point of the pattern as (x, y) coordinates
     *
     * @param  {Number} version QR Code version
     * @return {Array}          Array of coordinates
     */
    var getPositions = function getPositions (version) {
      const size = getSymbolSize(version);

      return [
        // top-left
        [0, 0],
        // top-right
        [size - FINDER_PATTERN_SIZE, 0],
        // bottom-left
        [0, size - FINDER_PATTERN_SIZE]
      ]
    };

    var finderPattern = {
    	getPositions: getPositions
    };

    /**
     * Data mask pattern reference
     * @type {Object}
     */

    var maskPattern = createCommonjsModule(function (module, exports) {
    exports.Patterns = {
      PATTERN000: 0,
      PATTERN001: 1,
      PATTERN010: 2,
      PATTERN011: 3,
      PATTERN100: 4,
      PATTERN101: 5,
      PATTERN110: 6,
      PATTERN111: 7
    };

    /**
     * Weighted penalty scores for the undesirable features
     * @type {Object}
     */
    const PenaltyScores = {
      N1: 3,
      N2: 3,
      N3: 40,
      N4: 10
    };

    /**
     * Check if mask pattern value is valid
     *
     * @param  {Number}  mask    Mask pattern
     * @return {Boolean}         true if valid, false otherwise
     */
    exports.isValid = function isValid (mask) {
      return mask != null && mask !== '' && !isNaN(mask) && mask >= 0 && mask <= 7
    };

    /**
     * Returns mask pattern from a value.
     * If value is not valid, returns undefined
     *
     * @param  {Number|String} value        Mask pattern value
     * @return {Number}                     Valid mask pattern or undefined
     */
    exports.from = function from (value) {
      return exports.isValid(value) ? parseInt(value, 10) : undefined
    };

    /**
    * Find adjacent modules in row/column with the same color
    * and assign a penalty value.
    *
    * Points: N1 + i
    * i is the amount by which the number of adjacent modules of the same color exceeds 5
    */
    exports.getPenaltyN1 = function getPenaltyN1 (data) {
      const size = data.size;
      let points = 0;
      let sameCountCol = 0;
      let sameCountRow = 0;
      let lastCol = null;
      let lastRow = null;

      for (let row = 0; row < size; row++) {
        sameCountCol = sameCountRow = 0;
        lastCol = lastRow = null;

        for (let col = 0; col < size; col++) {
          let module = data.get(row, col);
          if (module === lastCol) {
            sameCountCol++;
          } else {
            if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5);
            lastCol = module;
            sameCountCol = 1;
          }

          module = data.get(col, row);
          if (module === lastRow) {
            sameCountRow++;
          } else {
            if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5);
            lastRow = module;
            sameCountRow = 1;
          }
        }

        if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5);
        if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5);
      }

      return points
    };

    /**
     * Find 2x2 blocks with the same color and assign a penalty value
     *
     * Points: N2 * (m - 1) * (n - 1)
     */
    exports.getPenaltyN2 = function getPenaltyN2 (data) {
      const size = data.size;
      let points = 0;

      for (let row = 0; row < size - 1; row++) {
        for (let col = 0; col < size - 1; col++) {
          const last = data.get(row, col) +
            data.get(row, col + 1) +
            data.get(row + 1, col) +
            data.get(row + 1, col + 1);

          if (last === 4 || last === 0) points++;
        }
      }

      return points * PenaltyScores.N2
    };

    /**
     * Find 1:1:3:1:1 ratio (dark:light:dark:light:dark) pattern in row/column,
     * preceded or followed by light area 4 modules wide
     *
     * Points: N3 * number of pattern found
     */
    exports.getPenaltyN3 = function getPenaltyN3 (data) {
      const size = data.size;
      let points = 0;
      let bitsCol = 0;
      let bitsRow = 0;

      for (let row = 0; row < size; row++) {
        bitsCol = bitsRow = 0;
        for (let col = 0; col < size; col++) {
          bitsCol = ((bitsCol << 1) & 0x7FF) | data.get(row, col);
          if (col >= 10 && (bitsCol === 0x5D0 || bitsCol === 0x05D)) points++;

          bitsRow = ((bitsRow << 1) & 0x7FF) | data.get(col, row);
          if (col >= 10 && (bitsRow === 0x5D0 || bitsRow === 0x05D)) points++;
        }
      }

      return points * PenaltyScores.N3
    };

    /**
     * Calculate proportion of dark modules in entire symbol
     *
     * Points: N4 * k
     *
     * k is the rating of the deviation of the proportion of dark modules
     * in the symbol from 50% in steps of 5%
     */
    exports.getPenaltyN4 = function getPenaltyN4 (data) {
      let darkCount = 0;
      const modulesCount = data.data.length;

      for (let i = 0; i < modulesCount; i++) darkCount += data.data[i];

      const k = Math.abs(Math.ceil((darkCount * 100 / modulesCount) / 5) - 10);

      return k * PenaltyScores.N4
    };

    /**
     * Return mask value at given position
     *
     * @param  {Number} maskPattern Pattern reference value
     * @param  {Number} i           Row
     * @param  {Number} j           Column
     * @return {Boolean}            Mask value
     */
    function getMaskAt (maskPattern, i, j) {
      switch (maskPattern) {
        case exports.Patterns.PATTERN000: return (i + j) % 2 === 0
        case exports.Patterns.PATTERN001: return i % 2 === 0
        case exports.Patterns.PATTERN010: return j % 3 === 0
        case exports.Patterns.PATTERN011: return (i + j) % 3 === 0
        case exports.Patterns.PATTERN100: return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0
        case exports.Patterns.PATTERN101: return (i * j) % 2 + (i * j) % 3 === 0
        case exports.Patterns.PATTERN110: return ((i * j) % 2 + (i * j) % 3) % 2 === 0
        case exports.Patterns.PATTERN111: return ((i * j) % 3 + (i + j) % 2) % 2 === 0

        default: throw new Error('bad maskPattern:' + maskPattern)
      }
    }

    /**
     * Apply a mask pattern to a BitMatrix
     *
     * @param  {Number}    pattern Pattern reference number
     * @param  {BitMatrix} data    BitMatrix data
     */
    exports.applyMask = function applyMask (pattern, data) {
      const size = data.size;

      for (let col = 0; col < size; col++) {
        for (let row = 0; row < size; row++) {
          if (data.isReserved(row, col)) continue
          data.xor(row, col, getMaskAt(pattern, row, col));
        }
      }
    };

    /**
     * Returns the best mask pattern for data
     *
     * @param  {BitMatrix} data
     * @return {Number} Mask pattern reference number
     */
    exports.getBestMask = function getBestMask (data, setupFormatFunc) {
      const numPatterns = Object.keys(exports.Patterns).length;
      let bestPattern = 0;
      let lowerPenalty = Infinity;

      for (let p = 0; p < numPatterns; p++) {
        setupFormatFunc(p);
        exports.applyMask(p, data);

        // Calculate penalty
        const penalty =
          exports.getPenaltyN1(data) +
          exports.getPenaltyN2(data) +
          exports.getPenaltyN3(data) +
          exports.getPenaltyN4(data);

        // Undo previously applied mask
        exports.applyMask(p, data);

        if (penalty < lowerPenalty) {
          lowerPenalty = penalty;
          bestPattern = p;
        }
      }

      return bestPattern
    };
    });

    const EC_BLOCKS_TABLE = [
    // L  M  Q  H
      1, 1, 1, 1,
      1, 1, 1, 1,
      1, 1, 2, 2,
      1, 2, 2, 4,
      1, 2, 4, 4,
      2, 4, 4, 4,
      2, 4, 6, 5,
      2, 4, 6, 6,
      2, 5, 8, 8,
      4, 5, 8, 8,
      4, 5, 8, 11,
      4, 8, 10, 11,
      4, 9, 12, 16,
      4, 9, 16, 16,
      6, 10, 12, 18,
      6, 10, 17, 16,
      6, 11, 16, 19,
      6, 13, 18, 21,
      7, 14, 21, 25,
      8, 16, 20, 25,
      8, 17, 23, 25,
      9, 17, 23, 34,
      9, 18, 25, 30,
      10, 20, 27, 32,
      12, 21, 29, 35,
      12, 23, 34, 37,
      12, 25, 34, 40,
      13, 26, 35, 42,
      14, 28, 38, 45,
      15, 29, 40, 48,
      16, 31, 43, 51,
      17, 33, 45, 54,
      18, 35, 48, 57,
      19, 37, 51, 60,
      19, 38, 53, 63,
      20, 40, 56, 66,
      21, 43, 59, 70,
      22, 45, 62, 74,
      24, 47, 65, 77,
      25, 49, 68, 81
    ];

    const EC_CODEWORDS_TABLE = [
    // L  M  Q  H
      7, 10, 13, 17,
      10, 16, 22, 28,
      15, 26, 36, 44,
      20, 36, 52, 64,
      26, 48, 72, 88,
      36, 64, 96, 112,
      40, 72, 108, 130,
      48, 88, 132, 156,
      60, 110, 160, 192,
      72, 130, 192, 224,
      80, 150, 224, 264,
      96, 176, 260, 308,
      104, 198, 288, 352,
      120, 216, 320, 384,
      132, 240, 360, 432,
      144, 280, 408, 480,
      168, 308, 448, 532,
      180, 338, 504, 588,
      196, 364, 546, 650,
      224, 416, 600, 700,
      224, 442, 644, 750,
      252, 476, 690, 816,
      270, 504, 750, 900,
      300, 560, 810, 960,
      312, 588, 870, 1050,
      336, 644, 952, 1110,
      360, 700, 1020, 1200,
      390, 728, 1050, 1260,
      420, 784, 1140, 1350,
      450, 812, 1200, 1440,
      480, 868, 1290, 1530,
      510, 924, 1350, 1620,
      540, 980, 1440, 1710,
      570, 1036, 1530, 1800,
      570, 1064, 1590, 1890,
      600, 1120, 1680, 1980,
      630, 1204, 1770, 2100,
      660, 1260, 1860, 2220,
      720, 1316, 1950, 2310,
      750, 1372, 2040, 2430
    ];

    /**
     * Returns the number of error correction block that the QR Code should contain
     * for the specified version and error correction level.
     *
     * @param  {Number} version              QR Code version
     * @param  {Number} errorCorrectionLevel Error correction level
     * @return {Number}                      Number of error correction blocks
     */
    var getBlocksCount = function getBlocksCount (version, errorCorrectionLevel$1) {
      switch (errorCorrectionLevel$1) {
        case errorCorrectionLevel.L:
          return EC_BLOCKS_TABLE[(version - 1) * 4 + 0]
        case errorCorrectionLevel.M:
          return EC_BLOCKS_TABLE[(version - 1) * 4 + 1]
        case errorCorrectionLevel.Q:
          return EC_BLOCKS_TABLE[(version - 1) * 4 + 2]
        case errorCorrectionLevel.H:
          return EC_BLOCKS_TABLE[(version - 1) * 4 + 3]
        default:
          return undefined
      }
    };

    /**
     * Returns the number of error correction codewords to use for the specified
     * version and error correction level.
     *
     * @param  {Number} version              QR Code version
     * @param  {Number} errorCorrectionLevel Error correction level
     * @return {Number}                      Number of error correction codewords
     */
    var getTotalCodewordsCount = function getTotalCodewordsCount (version, errorCorrectionLevel$1) {
      switch (errorCorrectionLevel$1) {
        case errorCorrectionLevel.L:
          return EC_CODEWORDS_TABLE[(version - 1) * 4 + 0]
        case errorCorrectionLevel.M:
          return EC_CODEWORDS_TABLE[(version - 1) * 4 + 1]
        case errorCorrectionLevel.Q:
          return EC_CODEWORDS_TABLE[(version - 1) * 4 + 2]
        case errorCorrectionLevel.H:
          return EC_CODEWORDS_TABLE[(version - 1) * 4 + 3]
        default:
          return undefined
      }
    };

    var errorCorrectionCode = {
    	getBlocksCount: getBlocksCount,
    	getTotalCodewordsCount: getTotalCodewordsCount
    };

    const EXP_TABLE = new Uint8Array(512);
    const LOG_TABLE = new Uint8Array(256)
    /**
     * Precompute the log and anti-log tables for faster computation later
     *
     * For each possible value in the galois field 2^8, we will pre-compute
     * the logarithm and anti-logarithm (exponential) of this value
     *
     * ref {@link https://en.wikiversity.org/wiki/Reed%E2%80%93Solomon_codes_for_coders#Introduction_to_mathematical_fields}
     */
    ;(function initTables () {
      let x = 1;
      for (let i = 0; i < 255; i++) {
        EXP_TABLE[i] = x;
        LOG_TABLE[x] = i;

        x <<= 1; // multiply by 2

        // The QR code specification says to use byte-wise modulo 100011101 arithmetic.
        // This means that when a number is 256 or larger, it should be XORed with 0x11D.
        if (x & 0x100) { // similar to x >= 256, but a lot faster (because 0x100 == 256)
          x ^= 0x11D;
        }
      }

      // Optimization: double the size of the anti-log table so that we don't need to mod 255 to
      // stay inside the bounds (because we will mainly use this table for the multiplication of
      // two GF numbers, no more).
      // @see {@link mul}
      for (let i = 255; i < 512; i++) {
        EXP_TABLE[i] = EXP_TABLE[i - 255];
      }
    }());

    /**
     * Returns log value of n inside Galois Field
     *
     * @param  {Number} n
     * @return {Number}
     */
    var log = function log (n) {
      if (n < 1) throw new Error('log(' + n + ')')
      return LOG_TABLE[n]
    };

    /**
     * Returns anti-log value of n inside Galois Field
     *
     * @param  {Number} n
     * @return {Number}
     */
    var exp = function exp (n) {
      return EXP_TABLE[n]
    };

    /**
     * Multiplies two number inside Galois Field
     *
     * @param  {Number} x
     * @param  {Number} y
     * @return {Number}
     */
    var mul = function mul (x, y) {
      if (x === 0 || y === 0) return 0

      // should be EXP_TABLE[(LOG_TABLE[x] + LOG_TABLE[y]) % 255] if EXP_TABLE wasn't oversized
      // @see {@link initTables}
      return EXP_TABLE[LOG_TABLE[x] + LOG_TABLE[y]]
    };

    var galoisField = {
    	log: log,
    	exp: exp,
    	mul: mul
    };

    var polynomial = createCommonjsModule(function (module, exports) {
    /**
     * Multiplies two polynomials inside Galois Field
     *
     * @param  {Uint8Array} p1 Polynomial
     * @param  {Uint8Array} p2 Polynomial
     * @return {Uint8Array}    Product of p1 and p2
     */
    exports.mul = function mul (p1, p2) {
      const coeff = new Uint8Array(p1.length + p2.length - 1);

      for (let i = 0; i < p1.length; i++) {
        for (let j = 0; j < p2.length; j++) {
          coeff[i + j] ^= galoisField.mul(p1[i], p2[j]);
        }
      }

      return coeff
    };

    /**
     * Calculate the remainder of polynomials division
     *
     * @param  {Uint8Array} divident Polynomial
     * @param  {Uint8Array} divisor  Polynomial
     * @return {Uint8Array}          Remainder
     */
    exports.mod = function mod (divident, divisor) {
      let result = new Uint8Array(divident);

      while ((result.length - divisor.length) >= 0) {
        const coeff = result[0];

        for (let i = 0; i < divisor.length; i++) {
          result[i] ^= galoisField.mul(divisor[i], coeff);
        }

        // remove all zeros from buffer head
        let offset = 0;
        while (offset < result.length && result[offset] === 0) offset++;
        result = result.slice(offset);
      }

      return result
    };

    /**
     * Generate an irreducible generator polynomial of specified degree
     * (used by Reed-Solomon encoder)
     *
     * @param  {Number} degree Degree of the generator polynomial
     * @return {Uint8Array}    Buffer containing polynomial coefficients
     */
    exports.generateECPolynomial = function generateECPolynomial (degree) {
      let poly = new Uint8Array([1]);
      for (let i = 0; i < degree; i++) {
        poly = exports.mul(poly, new Uint8Array([1, galoisField.exp(i)]));
      }

      return poly
    };
    });

    function ReedSolomonEncoder (degree) {
      this.genPoly = undefined;
      this.degree = degree;

      if (this.degree) this.initialize(this.degree);
    }

    /**
     * Initialize the encoder.
     * The input param should correspond to the number of error correction codewords.
     *
     * @param  {Number} degree
     */
    ReedSolomonEncoder.prototype.initialize = function initialize (degree) {
      // create an irreducible generator polynomial
      this.degree = degree;
      this.genPoly = polynomial.generateECPolynomial(this.degree);
    };

    /**
     * Encodes a chunk of data
     *
     * @param  {Uint8Array} data Buffer containing input data
     * @return {Uint8Array}      Buffer containing encoded data
     */
    ReedSolomonEncoder.prototype.encode = function encode (data) {
      if (!this.genPoly) {
        throw new Error('Encoder not initialized')
      }

      // Calculate EC for this data block
      // extends data size to data+genPoly size
      const paddedData = new Uint8Array(data.length + this.degree);
      paddedData.set(data);

      // The error correction codewords are the remainder after dividing the data codewords
      // by a generator polynomial
      const remainder = polynomial.mod(paddedData, this.genPoly);

      // return EC data blocks (last n byte, where n is the degree of genPoly)
      // If coefficients number in remainder are less than genPoly degree,
      // pad with 0s to the left to reach the needed number of coefficients
      const start = this.degree - remainder.length;
      if (start > 0) {
        const buff = new Uint8Array(this.degree);
        buff.set(remainder, start);

        return buff
      }

      return remainder
    };

    var reedSolomonEncoder = ReedSolomonEncoder;

    /**
     * Check if QR Code version is valid
     *
     * @param  {Number}  version QR Code version
     * @return {Boolean}         true if valid version, false otherwise
     */
    var isValid = function isValid (version) {
      return !isNaN(version) && version >= 1 && version <= 40
    };

    var versionCheck = {
    	isValid: isValid
    };

    const numeric = '[0-9]+';
    const alphanumeric = '[A-Z $%*+\\-./:]+';
    let kanji = '(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|' +
      '[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|' +
      '[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|' +
      '[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+';
    kanji = kanji.replace(/u/g, '\\u');

    const byte = '(?:(?![A-Z0-9 $%*+\\-./:]|' + kanji + ')(?:.|[\r\n]))+';

    var KANJI = new RegExp(kanji, 'g');
    var BYTE_KANJI = new RegExp('[^A-Z0-9 $%*+\\-./:]+', 'g');
    var BYTE = new RegExp(byte, 'g');
    var NUMERIC = new RegExp(numeric, 'g');
    var ALPHANUMERIC = new RegExp(alphanumeric, 'g');

    const TEST_KANJI = new RegExp('^' + kanji + '$');
    const TEST_NUMERIC = new RegExp('^' + numeric + '$');
    const TEST_ALPHANUMERIC = new RegExp('^[A-Z0-9 $%*+\\-./:]+$');

    var testKanji = function testKanji (str) {
      return TEST_KANJI.test(str)
    };

    var testNumeric = function testNumeric (str) {
      return TEST_NUMERIC.test(str)
    };

    var testAlphanumeric = function testAlphanumeric (str) {
      return TEST_ALPHANUMERIC.test(str)
    };

    var regex = {
    	KANJI: KANJI,
    	BYTE_KANJI: BYTE_KANJI,
    	BYTE: BYTE,
    	NUMERIC: NUMERIC,
    	ALPHANUMERIC: ALPHANUMERIC,
    	testKanji: testKanji,
    	testNumeric: testNumeric,
    	testAlphanumeric: testAlphanumeric
    };

    var mode = createCommonjsModule(function (module, exports) {
    /**
     * Numeric mode encodes data from the decimal digit set (0 - 9)
     * (byte values 30HEX to 39HEX).
     * Normally, 3 data characters are represented by 10 bits.
     *
     * @type {Object}
     */
    exports.NUMERIC = {
      id: 'Numeric',
      bit: 1 << 0,
      ccBits: [10, 12, 14]
    };

    /**
     * Alphanumeric mode encodes data from a set of 45 characters,
     * i.e. 10 numeric digits (0 - 9),
     *      26 alphabetic characters (A - Z),
     *   and 9 symbols (SP, $, %, *, +, -, ., /, :).
     * Normally, two input characters are represented by 11 bits.
     *
     * @type {Object}
     */
    exports.ALPHANUMERIC = {
      id: 'Alphanumeric',
      bit: 1 << 1,
      ccBits: [9, 11, 13]
    };

    /**
     * In byte mode, data is encoded at 8 bits per character.
     *
     * @type {Object}
     */
    exports.BYTE = {
      id: 'Byte',
      bit: 1 << 2,
      ccBits: [8, 16, 16]
    };

    /**
     * The Kanji mode efficiently encodes Kanji characters in accordance with
     * the Shift JIS system based on JIS X 0208.
     * The Shift JIS values are shifted from the JIS X 0208 values.
     * JIS X 0208 gives details of the shift coded representation.
     * Each two-byte character value is compacted to a 13-bit binary codeword.
     *
     * @type {Object}
     */
    exports.KANJI = {
      id: 'Kanji',
      bit: 1 << 3,
      ccBits: [8, 10, 12]
    };

    /**
     * Mixed mode will contain a sequences of data in a combination of any of
     * the modes described above
     *
     * @type {Object}
     */
    exports.MIXED = {
      bit: -1
    };

    /**
     * Returns the number of bits needed to store the data length
     * according to QR Code specifications.
     *
     * @param  {Mode}   mode    Data mode
     * @param  {Number} version QR Code version
     * @return {Number}         Number of bits
     */
    exports.getCharCountIndicator = function getCharCountIndicator (mode, version) {
      if (!mode.ccBits) throw new Error('Invalid mode: ' + mode)

      if (!versionCheck.isValid(version)) {
        throw new Error('Invalid version: ' + version)
      }

      if (version >= 1 && version < 10) return mode.ccBits[0]
      else if (version < 27) return mode.ccBits[1]
      return mode.ccBits[2]
    };

    /**
     * Returns the most efficient mode to store the specified data
     *
     * @param  {String} dataStr Input data string
     * @return {Mode}           Best mode
     */
    exports.getBestModeForData = function getBestModeForData (dataStr) {
      if (regex.testNumeric(dataStr)) return exports.NUMERIC
      else if (regex.testAlphanumeric(dataStr)) return exports.ALPHANUMERIC
      else if (regex.testKanji(dataStr)) return exports.KANJI
      else return exports.BYTE
    };

    /**
     * Return mode name as string
     *
     * @param {Mode} mode Mode object
     * @returns {String}  Mode name
     */
    exports.toString = function toString (mode) {
      if (mode && mode.id) return mode.id
      throw new Error('Invalid mode')
    };

    /**
     * Check if input param is a valid mode object
     *
     * @param   {Mode}    mode Mode object
     * @returns {Boolean} True if valid mode, false otherwise
     */
    exports.isValid = function isValid (mode) {
      return mode && mode.bit && mode.ccBits
    };

    /**
     * Get mode object from its name
     *
     * @param   {String} string Mode name
     * @returns {Mode}          Mode object
     */
    function fromString (string) {
      if (typeof string !== 'string') {
        throw new Error('Param is not a string')
      }

      const lcStr = string.toLowerCase();

      switch (lcStr) {
        case 'numeric':
          return exports.NUMERIC
        case 'alphanumeric':
          return exports.ALPHANUMERIC
        case 'kanji':
          return exports.KANJI
        case 'byte':
          return exports.BYTE
        default:
          throw new Error('Unknown mode: ' + string)
      }
    }

    /**
     * Returns mode from a value.
     * If value is not a valid mode, returns defaultValue
     *
     * @param  {Mode|String} value        Encoding mode
     * @param  {Mode}        defaultValue Fallback value
     * @return {Mode}                     Encoding mode
     */
    exports.from = function from (value, defaultValue) {
      if (exports.isValid(value)) {
        return value
      }

      try {
        return fromString(value)
      } catch (e) {
        return defaultValue
      }
    };
    });

    var version = createCommonjsModule(function (module, exports) {
    // Generator polynomial used to encode version information
    const G18 = (1 << 12) | (1 << 11) | (1 << 10) | (1 << 9) | (1 << 8) | (1 << 5) | (1 << 2) | (1 << 0);
    const G18_BCH = utils$1.getBCHDigit(G18);

    function getBestVersionForDataLength (mode, length, errorCorrectionLevel) {
      for (let currentVersion = 1; currentVersion <= 40; currentVersion++) {
        if (length <= exports.getCapacity(currentVersion, errorCorrectionLevel, mode)) {
          return currentVersion
        }
      }

      return undefined
    }

    function getReservedBitsCount (mode$1, version) {
      // Character count indicator + mode indicator bits
      return mode.getCharCountIndicator(mode$1, version) + 4
    }

    function getTotalBitsFromDataArray (segments, version) {
      let totalBits = 0;

      segments.forEach(function (data) {
        const reservedBits = getReservedBitsCount(data.mode, version);
        totalBits += reservedBits + data.getBitsLength();
      });

      return totalBits
    }

    function getBestVersionForMixedData (segments, errorCorrectionLevel) {
      for (let currentVersion = 1; currentVersion <= 40; currentVersion++) {
        const length = getTotalBitsFromDataArray(segments, currentVersion);
        if (length <= exports.getCapacity(currentVersion, errorCorrectionLevel, mode.MIXED)) {
          return currentVersion
        }
      }

      return undefined
    }

    /**
     * Returns version number from a value.
     * If value is not a valid version, returns defaultValue
     *
     * @param  {Number|String} value        QR Code version
     * @param  {Number}        defaultValue Fallback value
     * @return {Number}                     QR Code version number
     */
    exports.from = function from (value, defaultValue) {
      if (versionCheck.isValid(value)) {
        return parseInt(value, 10)
      }

      return defaultValue
    };

    /**
     * Returns how much data can be stored with the specified QR code version
     * and error correction level
     *
     * @param  {Number} version              QR Code version (1-40)
     * @param  {Number} errorCorrectionLevel Error correction level
     * @param  {Mode}   mode                 Data mode
     * @return {Number}                      Quantity of storable data
     */
    exports.getCapacity = function getCapacity (version, errorCorrectionLevel, mode$1) {
      if (!versionCheck.isValid(version)) {
        throw new Error('Invalid QR Code version')
      }

      // Use Byte mode as default
      if (typeof mode$1 === 'undefined') mode$1 = mode.BYTE;

      // Total codewords for this QR code version (Data + Error correction)
      const totalCodewords = utils$1.getSymbolTotalCodewords(version);

      // Total number of error correction codewords
      const ecTotalCodewords = errorCorrectionCode.getTotalCodewordsCount(version, errorCorrectionLevel);

      // Total number of data codewords
      const dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;

      if (mode$1 === mode.MIXED) return dataTotalCodewordsBits

      const usableBits = dataTotalCodewordsBits - getReservedBitsCount(mode$1, version);

      // Return max number of storable codewords
      switch (mode$1) {
        case mode.NUMERIC:
          return Math.floor((usableBits / 10) * 3)

        case mode.ALPHANUMERIC:
          return Math.floor((usableBits / 11) * 2)

        case mode.KANJI:
          return Math.floor(usableBits / 13)

        case mode.BYTE:
        default:
          return Math.floor(usableBits / 8)
      }
    };

    /**
     * Returns the minimum version needed to contain the amount of data
     *
     * @param  {Segment} data                    Segment of data
     * @param  {Number} [errorCorrectionLevel=H] Error correction level
     * @param  {Mode} mode                       Data mode
     * @return {Number}                          QR Code version
     */
    exports.getBestVersionForData = function getBestVersionForData (data, errorCorrectionLevel$1) {
      let seg;

      const ecl = errorCorrectionLevel.from(errorCorrectionLevel$1, errorCorrectionLevel.M);

      if (Array.isArray(data)) {
        if (data.length > 1) {
          return getBestVersionForMixedData(data, ecl)
        }

        if (data.length === 0) {
          return 1
        }

        seg = data[0];
      } else {
        seg = data;
      }

      return getBestVersionForDataLength(seg.mode, seg.getLength(), ecl)
    };

    /**
     * Returns version information with relative error correction bits
     *
     * The version information is included in QR Code symbols of version 7 or larger.
     * It consists of an 18-bit sequence containing 6 data bits,
     * with 12 error correction bits calculated using the (18, 6) Golay code.
     *
     * @param  {Number} version QR Code version
     * @return {Number}         Encoded version info bits
     */
    exports.getEncodedBits = function getEncodedBits (version) {
      if (!versionCheck.isValid(version) || version < 7) {
        throw new Error('Invalid QR Code version')
      }

      let d = version << 12;

      while (utils$1.getBCHDigit(d) - G18_BCH >= 0) {
        d ^= (G18 << (utils$1.getBCHDigit(d) - G18_BCH));
      }

      return (version << 12) | d
    };
    });

    const G15 = (1 << 10) | (1 << 8) | (1 << 5) | (1 << 4) | (1 << 2) | (1 << 1) | (1 << 0);
    const G15_MASK = (1 << 14) | (1 << 12) | (1 << 10) | (1 << 4) | (1 << 1);
    const G15_BCH = utils$1.getBCHDigit(G15);

    /**
     * Returns format information with relative error correction bits
     *
     * The format information is a 15-bit sequence containing 5 data bits,
     * with 10 error correction bits calculated using the (15, 5) BCH code.
     *
     * @param  {Number} errorCorrectionLevel Error correction level
     * @param  {Number} mask                 Mask pattern
     * @return {Number}                      Encoded format information bits
     */
    var getEncodedBits = function getEncodedBits (errorCorrectionLevel, mask) {
      const data = ((errorCorrectionLevel.bit << 3) | mask);
      let d = data << 10;

      while (utils$1.getBCHDigit(d) - G15_BCH >= 0) {
        d ^= (G15 << (utils$1.getBCHDigit(d) - G15_BCH));
      }

      // xor final data with mask pattern in order to ensure that
      // no combination of Error Correction Level and data mask pattern
      // will result in an all-zero data string
      return ((data << 10) | d) ^ G15_MASK
    };

    var formatInfo = {
    	getEncodedBits: getEncodedBits
    };

    function NumericData (data) {
      this.mode = mode.NUMERIC;
      this.data = data.toString();
    }

    NumericData.getBitsLength = function getBitsLength (length) {
      return 10 * Math.floor(length / 3) + ((length % 3) ? ((length % 3) * 3 + 1) : 0)
    };

    NumericData.prototype.getLength = function getLength () {
      return this.data.length
    };

    NumericData.prototype.getBitsLength = function getBitsLength () {
      return NumericData.getBitsLength(this.data.length)
    };

    NumericData.prototype.write = function write (bitBuffer) {
      let i, group, value;

      // The input data string is divided into groups of three digits,
      // and each group is converted to its 10-bit binary equivalent.
      for (i = 0; i + 3 <= this.data.length; i += 3) {
        group = this.data.substr(i, 3);
        value = parseInt(group, 10);

        bitBuffer.put(value, 10);
      }

      // If the number of input digits is not an exact multiple of three,
      // the final one or two digits are converted to 4 or 7 bits respectively.
      const remainingNum = this.data.length - i;
      if (remainingNum > 0) {
        group = this.data.substr(i);
        value = parseInt(group, 10);

        bitBuffer.put(value, remainingNum * 3 + 1);
      }
    };

    var numericData = NumericData;

    /**
     * Array of characters available in alphanumeric mode
     *
     * As per QR Code specification, to each character
     * is assigned a value from 0 to 44 which in this case coincides
     * with the array index
     *
     * @type {Array}
     */
    const ALPHA_NUM_CHARS = [
      '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
      'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M',
      'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z',
      ' ', '$', '%', '*', '+', '-', '.', '/', ':'
    ];

    function AlphanumericData (data) {
      this.mode = mode.ALPHANUMERIC;
      this.data = data;
    }

    AlphanumericData.getBitsLength = function getBitsLength (length) {
      return 11 * Math.floor(length / 2) + 6 * (length % 2)
    };

    AlphanumericData.prototype.getLength = function getLength () {
      return this.data.length
    };

    AlphanumericData.prototype.getBitsLength = function getBitsLength () {
      return AlphanumericData.getBitsLength(this.data.length)
    };

    AlphanumericData.prototype.write = function write (bitBuffer) {
      let i;

      // Input data characters are divided into groups of two characters
      // and encoded as 11-bit binary codes.
      for (i = 0; i + 2 <= this.data.length; i += 2) {
        // The character value of the first character is multiplied by 45
        let value = ALPHA_NUM_CHARS.indexOf(this.data[i]) * 45;

        // The character value of the second digit is added to the product
        value += ALPHA_NUM_CHARS.indexOf(this.data[i + 1]);

        // The sum is then stored as 11-bit binary number
        bitBuffer.put(value, 11);
      }

      // If the number of input data characters is not a multiple of two,
      // the character value of the final character is encoded as a 6-bit binary number.
      if (this.data.length % 2) {
        bitBuffer.put(ALPHA_NUM_CHARS.indexOf(this.data[i]), 6);
      }
    };

    var alphanumericData = AlphanumericData;

    var encodeUtf8 = function encodeUtf8 (input) {
      var result = [];
      var size = input.length;

      for (var index = 0; index < size; index++) {
        var point = input.charCodeAt(index);

        if (point >= 0xD800 && point <= 0xDBFF && size > index + 1) {
          var second = input.charCodeAt(index + 1);

          if (second >= 0xDC00 && second <= 0xDFFF) {
            // https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
            point = (point - 0xD800) * 0x400 + second - 0xDC00 + 0x10000;
            index += 1;
          }
        }

        // US-ASCII
        if (point < 0x80) {
          result.push(point);
          continue
        }

        // 2-byte UTF-8
        if (point < 0x800) {
          result.push((point >> 6) | 192);
          result.push((point & 63) | 128);
          continue
        }

        // 3-byte UTF-8
        if (point < 0xD800 || (point >= 0xE000 && point < 0x10000)) {
          result.push((point >> 12) | 224);
          result.push(((point >> 6) & 63) | 128);
          result.push((point & 63) | 128);
          continue
        }

        // 4-byte UTF-8
        if (point >= 0x10000 && point <= 0x10FFFF) {
          result.push((point >> 18) | 240);
          result.push(((point >> 12) & 63) | 128);
          result.push(((point >> 6) & 63) | 128);
          result.push((point & 63) | 128);
          continue
        }

        // Invalid character
        result.push(0xEF, 0xBF, 0xBD);
      }

      return new Uint8Array(result).buffer
    };

    function ByteData (data) {
      this.mode = mode.BYTE;
      this.data = new Uint8Array(encodeUtf8(data));
    }

    ByteData.getBitsLength = function getBitsLength (length) {
      return length * 8
    };

    ByteData.prototype.getLength = function getLength () {
      return this.data.length
    };

    ByteData.prototype.getBitsLength = function getBitsLength () {
      return ByteData.getBitsLength(this.data.length)
    };

    ByteData.prototype.write = function (bitBuffer) {
      for (let i = 0, l = this.data.length; i < l; i++) {
        bitBuffer.put(this.data[i], 8);
      }
    };

    var byteData = ByteData;

    function KanjiData (data) {
      this.mode = mode.KANJI;
      this.data = data;
    }

    KanjiData.getBitsLength = function getBitsLength (length) {
      return length * 13
    };

    KanjiData.prototype.getLength = function getLength () {
      return this.data.length
    };

    KanjiData.prototype.getBitsLength = function getBitsLength () {
      return KanjiData.getBitsLength(this.data.length)
    };

    KanjiData.prototype.write = function (bitBuffer) {
      let i;

      // In the Shift JIS system, Kanji characters are represented by a two byte combination.
      // These byte values are shifted from the JIS X 0208 values.
      // JIS X 0208 gives details of the shift coded representation.
      for (i = 0; i < this.data.length; i++) {
        let value = utils$1.toSJIS(this.data[i]);

        // For characters with Shift JIS values from 0x8140 to 0x9FFC:
        if (value >= 0x8140 && value <= 0x9FFC) {
          // Subtract 0x8140 from Shift JIS value
          value -= 0x8140;

        // For characters with Shift JIS values from 0xE040 to 0xEBBF
        } else if (value >= 0xE040 && value <= 0xEBBF) {
          // Subtract 0xC140 from Shift JIS value
          value -= 0xC140;
        } else {
          throw new Error(
            'Invalid SJIS character: ' + this.data[i] + '\n' +
            'Make sure your charset is UTF-8')
        }

        // Multiply most significant byte of result by 0xC0
        // and add least significant byte to product
        value = (((value >>> 8) & 0xff) * 0xC0) + (value & 0xff);

        // Convert result to a 13-bit binary string
        bitBuffer.put(value, 13);
      }
    };

    var kanjiData = KanjiData;

    var dijkstra_1 = createCommonjsModule(function (module) {

    /******************************************************************************
     * Created 2008-08-19.
     *
     * Dijkstra path-finding functions. Adapted from the Dijkstar Python project.
     *
     * Copyright (C) 2008
     *   Wyatt Baldwin <self@wyattbaldwin.com>
     *   All rights reserved
     *
     * Licensed under the MIT license.
     *
     *   http://www.opensource.org/licenses/mit-license.php
     *
     * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
     * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
     * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
     * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
     * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
     * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
     * THE SOFTWARE.
     *****************************************************************************/
    var dijkstra = {
      single_source_shortest_paths: function(graph, s, d) {
        // Predecessor map for each node that has been encountered.
        // node ID => predecessor node ID
        var predecessors = {};

        // Costs of shortest paths from s to all nodes encountered.
        // node ID => cost
        var costs = {};
        costs[s] = 0;

        // Costs of shortest paths from s to all nodes encountered; differs from
        // `costs` in that it provides easy access to the node that currently has
        // the known shortest path from s.
        // XXX: Do we actually need both `costs` and `open`?
        var open = dijkstra.PriorityQueue.make();
        open.push(s, 0);

        var closest,
            u, v,
            cost_of_s_to_u,
            adjacent_nodes,
            cost_of_e,
            cost_of_s_to_u_plus_cost_of_e,
            cost_of_s_to_v,
            first_visit;
        while (!open.empty()) {
          // In the nodes remaining in graph that have a known cost from s,
          // find the node, u, that currently has the shortest path from s.
          closest = open.pop();
          u = closest.value;
          cost_of_s_to_u = closest.cost;

          // Get nodes adjacent to u...
          adjacent_nodes = graph[u] || {};

          // ...and explore the edges that connect u to those nodes, updating
          // the cost of the shortest paths to any or all of those nodes as
          // necessary. v is the node across the current edge from u.
          for (v in adjacent_nodes) {
            if (adjacent_nodes.hasOwnProperty(v)) {
              // Get the cost of the edge running from u to v.
              cost_of_e = adjacent_nodes[v];

              // Cost of s to u plus the cost of u to v across e--this is *a*
              // cost from s to v that may or may not be less than the current
              // known cost to v.
              cost_of_s_to_u_plus_cost_of_e = cost_of_s_to_u + cost_of_e;

              // If we haven't visited v yet OR if the current known cost from s to
              // v is greater than the new cost we just found (cost of s to u plus
              // cost of u to v across e), update v's cost in the cost list and
              // update v's predecessor in the predecessor list (it's now u).
              cost_of_s_to_v = costs[v];
              first_visit = (typeof costs[v] === 'undefined');
              if (first_visit || cost_of_s_to_v > cost_of_s_to_u_plus_cost_of_e) {
                costs[v] = cost_of_s_to_u_plus_cost_of_e;
                open.push(v, cost_of_s_to_u_plus_cost_of_e);
                predecessors[v] = u;
              }
            }
          }
        }

        if (typeof d !== 'undefined' && typeof costs[d] === 'undefined') {
          var msg = ['Could not find a path from ', s, ' to ', d, '.'].join('');
          throw new Error(msg);
        }

        return predecessors;
      },

      extract_shortest_path_from_predecessor_list: function(predecessors, d) {
        var nodes = [];
        var u = d;
        while (u) {
          nodes.push(u);
          u = predecessors[u];
        }
        nodes.reverse();
        return nodes;
      },

      find_path: function(graph, s, d) {
        var predecessors = dijkstra.single_source_shortest_paths(graph, s, d);
        return dijkstra.extract_shortest_path_from_predecessor_list(
          predecessors, d);
      },

      /**
       * A very naive priority queue implementation.
       */
      PriorityQueue: {
        make: function (opts) {
          var T = dijkstra.PriorityQueue,
              t = {},
              key;
          opts = opts || {};
          for (key in T) {
            if (T.hasOwnProperty(key)) {
              t[key] = T[key];
            }
          }
          t.queue = [];
          t.sorter = opts.sorter || T.default_sorter;
          return t;
        },

        default_sorter: function (a, b) {
          return a.cost - b.cost;
        },

        /**
         * Add a new item to the queue and ensure the highest priority element
         * is at the front of the queue.
         */
        push: function (value, cost) {
          var item = {value: value, cost: cost};
          this.queue.push(item);
          this.queue.sort(this.sorter);
        },

        /**
         * Return the highest priority element in the queue.
         */
        pop: function () {
          return this.queue.shift();
        },

        empty: function () {
          return this.queue.length === 0;
        }
      }
    };


    // node.js module exports
    {
      module.exports = dijkstra;
    }
    });

    var segments = createCommonjsModule(function (module, exports) {
    /**
     * Returns UTF8 byte length
     *
     * @param  {String} str Input string
     * @return {Number}     Number of byte
     */
    function getStringByteLength (str) {
      return unescape(encodeURIComponent(str)).length
    }

    /**
     * Get a list of segments of the specified mode
     * from a string
     *
     * @param  {Mode}   mode Segment mode
     * @param  {String} str  String to process
     * @return {Array}       Array of object with segments data
     */
    function getSegments (regex, mode, str) {
      const segments = [];
      let result;

      while ((result = regex.exec(str)) !== null) {
        segments.push({
          data: result[0],
          index: result.index,
          mode: mode,
          length: result[0].length
        });
      }

      return segments
    }

    /**
     * Extracts a series of segments with the appropriate
     * modes from a string
     *
     * @param  {String} dataStr Input string
     * @return {Array}          Array of object with segments data
     */
    function getSegmentsFromString (dataStr) {
      const numSegs = getSegments(regex.NUMERIC, mode.NUMERIC, dataStr);
      const alphaNumSegs = getSegments(regex.ALPHANUMERIC, mode.ALPHANUMERIC, dataStr);
      let byteSegs;
      let kanjiSegs;

      if (utils$1.isKanjiModeEnabled()) {
        byteSegs = getSegments(regex.BYTE, mode.BYTE, dataStr);
        kanjiSegs = getSegments(regex.KANJI, mode.KANJI, dataStr);
      } else {
        byteSegs = getSegments(regex.BYTE_KANJI, mode.BYTE, dataStr);
        kanjiSegs = [];
      }

      const segs = numSegs.concat(alphaNumSegs, byteSegs, kanjiSegs);

      return segs
        .sort(function (s1, s2) {
          return s1.index - s2.index
        })
        .map(function (obj) {
          return {
            data: obj.data,
            mode: obj.mode,
            length: obj.length
          }
        })
    }

    /**
     * Returns how many bits are needed to encode a string of
     * specified length with the specified mode
     *
     * @param  {Number} length String length
     * @param  {Mode} mode     Segment mode
     * @return {Number}        Bit length
     */
    function getSegmentBitsLength (length, mode$1) {
      switch (mode$1) {
        case mode.NUMERIC:
          return numericData.getBitsLength(length)
        case mode.ALPHANUMERIC:
          return alphanumericData.getBitsLength(length)
        case mode.KANJI:
          return kanjiData.getBitsLength(length)
        case mode.BYTE:
          return byteData.getBitsLength(length)
      }
    }

    /**
     * Merges adjacent segments which have the same mode
     *
     * @param  {Array} segs Array of object with segments data
     * @return {Array}      Array of object with segments data
     */
    function mergeSegments (segs) {
      return segs.reduce(function (acc, curr) {
        const prevSeg = acc.length - 1 >= 0 ? acc[acc.length - 1] : null;
        if (prevSeg && prevSeg.mode === curr.mode) {
          acc[acc.length - 1].data += curr.data;
          return acc
        }

        acc.push(curr);
        return acc
      }, [])
    }

    /**
     * Generates a list of all possible nodes combination which
     * will be used to build a segments graph.
     *
     * Nodes are divided by groups. Each group will contain a list of all the modes
     * in which is possible to encode the given text.
     *
     * For example the text '12345' can be encoded as Numeric, Alphanumeric or Byte.
     * The group for '12345' will contain then 3 objects, one for each
     * possible encoding mode.
     *
     * Each node represents a possible segment.
     *
     * @param  {Array} segs Array of object with segments data
     * @return {Array}      Array of object with segments data
     */
    function buildNodes (segs) {
      const nodes = [];
      for (let i = 0; i < segs.length; i++) {
        const seg = segs[i];

        switch (seg.mode) {
          case mode.NUMERIC:
            nodes.push([seg,
              { data: seg.data, mode: mode.ALPHANUMERIC, length: seg.length },
              { data: seg.data, mode: mode.BYTE, length: seg.length }
            ]);
            break
          case mode.ALPHANUMERIC:
            nodes.push([seg,
              { data: seg.data, mode: mode.BYTE, length: seg.length }
            ]);
            break
          case mode.KANJI:
            nodes.push([seg,
              { data: seg.data, mode: mode.BYTE, length: getStringByteLength(seg.data) }
            ]);
            break
          case mode.BYTE:
            nodes.push([
              { data: seg.data, mode: mode.BYTE, length: getStringByteLength(seg.data) }
            ]);
        }
      }

      return nodes
    }

    /**
     * Builds a graph from a list of nodes.
     * All segments in each node group will be connected with all the segments of
     * the next group and so on.
     *
     * At each connection will be assigned a weight depending on the
     * segment's byte length.
     *
     * @param  {Array} nodes    Array of object with segments data
     * @param  {Number} version QR Code version
     * @return {Object}         Graph of all possible segments
     */
    function buildGraph (nodes, version) {
      const table = {};
      const graph = { start: {} };
      let prevNodeIds = ['start'];

      for (let i = 0; i < nodes.length; i++) {
        const nodeGroup = nodes[i];
        const currentNodeIds = [];

        for (let j = 0; j < nodeGroup.length; j++) {
          const node = nodeGroup[j];
          const key = '' + i + j;

          currentNodeIds.push(key);
          table[key] = { node: node, lastCount: 0 };
          graph[key] = {};

          for (let n = 0; n < prevNodeIds.length; n++) {
            const prevNodeId = prevNodeIds[n];

            if (table[prevNodeId] && table[prevNodeId].node.mode === node.mode) {
              graph[prevNodeId][key] =
                getSegmentBitsLength(table[prevNodeId].lastCount + node.length, node.mode) -
                getSegmentBitsLength(table[prevNodeId].lastCount, node.mode);

              table[prevNodeId].lastCount += node.length;
            } else {
              if (table[prevNodeId]) table[prevNodeId].lastCount = node.length;

              graph[prevNodeId][key] = getSegmentBitsLength(node.length, node.mode) +
                4 + mode.getCharCountIndicator(node.mode, version); // switch cost
            }
          }
        }

        prevNodeIds = currentNodeIds;
      }

      for (let n = 0; n < prevNodeIds.length; n++) {
        graph[prevNodeIds[n]].end = 0;
      }

      return { map: graph, table: table }
    }

    /**
     * Builds a segment from a specified data and mode.
     * If a mode is not specified, the more suitable will be used.
     *
     * @param  {String} data             Input data
     * @param  {Mode | String} modesHint Data mode
     * @return {Segment}                 Segment
     */
    function buildSingleSegment (data, modesHint) {
      let mode$1;
      const bestMode = mode.getBestModeForData(data);

      mode$1 = mode.from(modesHint, bestMode);

      // Make sure data can be encoded
      if (mode$1 !== mode.BYTE && mode$1.bit < bestMode.bit) {
        throw new Error('"' + data + '"' +
          ' cannot be encoded with mode ' + mode.toString(mode$1) +
          '.\n Suggested mode is: ' + mode.toString(bestMode))
      }

      // Use Mode.BYTE if Kanji support is disabled
      if (mode$1 === mode.KANJI && !utils$1.isKanjiModeEnabled()) {
        mode$1 = mode.BYTE;
      }

      switch (mode$1) {
        case mode.NUMERIC:
          return new numericData(data)

        case mode.ALPHANUMERIC:
          return new alphanumericData(data)

        case mode.KANJI:
          return new kanjiData(data)

        case mode.BYTE:
          return new byteData(data)
      }
    }

    /**
     * Builds a list of segments from an array.
     * Array can contain Strings or Objects with segment's info.
     *
     * For each item which is a string, will be generated a segment with the given
     * string and the more appropriate encoding mode.
     *
     * For each item which is an object, will be generated a segment with the given
     * data and mode.
     * Objects must contain at least the property "data".
     * If property "mode" is not present, the more suitable mode will be used.
     *
     * @param  {Array} array Array of objects with segments data
     * @return {Array}       Array of Segments
     */
    exports.fromArray = function fromArray (array) {
      return array.reduce(function (acc, seg) {
        if (typeof seg === 'string') {
          acc.push(buildSingleSegment(seg, null));
        } else if (seg.data) {
          acc.push(buildSingleSegment(seg.data, seg.mode));
        }

        return acc
      }, [])
    };

    /**
     * Builds an optimized sequence of segments from a string,
     * which will produce the shortest possible bitstream.
     *
     * @param  {String} data    Input string
     * @param  {Number} version QR Code version
     * @return {Array}          Array of segments
     */
    exports.fromString = function fromString (data, version) {
      const segs = getSegmentsFromString(data);

      const nodes = buildNodes(segs);
      const graph = buildGraph(nodes, version);
      const path = dijkstra_1.find_path(graph.map, 'start', 'end');

      const optimizedSegs = [];
      for (let i = 1; i < path.length - 1; i++) {
        optimizedSegs.push(graph.table[path[i]].node);
      }

      return exports.fromArray(mergeSegments(optimizedSegs))
    };

    /**
     * Splits a string in various segments with the modes which
     * best represent their content.
     * The produced segments are far from being optimized.
     * The output of this function is only used to estimate a QR Code version
     * which may contain the data.
     *
     * @param  {string} data Input string
     * @return {Array}       Array of segments
     */
    exports.rawSplit = function rawSplit (data) {
      return exports.fromArray(
        getSegmentsFromString(data)
      )
    };
    });

    /**
     * QRCode for JavaScript
     *
     * modified by Ryan Day for nodejs support
     * Copyright (c) 2011 Ryan Day
     *
     * Licensed under the MIT license:
     *   http://www.opensource.org/licenses/mit-license.php
     *
    //---------------------------------------------------------------------
    // QRCode for JavaScript
    //
    // Copyright (c) 2009 Kazuhiko Arase
    //
    // URL: http://www.d-project.com/
    //
    // Licensed under the MIT license:
    //   http://www.opensource.org/licenses/mit-license.php
    //
    // The word "QR Code" is registered trademark of
    // DENSO WAVE INCORPORATED
    //   http://www.denso-wave.com/qrcode/faqpatent-e.html
    //
    //---------------------------------------------------------------------
    */

    /**
     * Add finder patterns bits to matrix
     *
     * @param  {BitMatrix} matrix  Modules matrix
     * @param  {Number}    version QR Code version
     */
    function setupFinderPattern (matrix, version) {
      const size = matrix.size;
      const pos = finderPattern.getPositions(version);

      for (let i = 0; i < pos.length; i++) {
        const row = pos[i][0];
        const col = pos[i][1];

        for (let r = -1; r <= 7; r++) {
          if (row + r <= -1 || size <= row + r) continue

          for (let c = -1; c <= 7; c++) {
            if (col + c <= -1 || size <= col + c) continue

            if ((r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
              (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
              (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
              matrix.set(row + r, col + c, true, true);
            } else {
              matrix.set(row + r, col + c, false, true);
            }
          }
        }
      }
    }

    /**
     * Add timing pattern bits to matrix
     *
     * Note: this function must be called before {@link setupAlignmentPattern}
     *
     * @param  {BitMatrix} matrix Modules matrix
     */
    function setupTimingPattern (matrix) {
      const size = matrix.size;

      for (let r = 8; r < size - 8; r++) {
        const value = r % 2 === 0;
        matrix.set(r, 6, value, true);
        matrix.set(6, r, value, true);
      }
    }

    /**
     * Add alignment patterns bits to matrix
     *
     * Note: this function must be called after {@link setupTimingPattern}
     *
     * @param  {BitMatrix} matrix  Modules matrix
     * @param  {Number}    version QR Code version
     */
    function setupAlignmentPattern (matrix, version) {
      const pos = alignmentPattern.getPositions(version);

      for (let i = 0; i < pos.length; i++) {
        const row = pos[i][0];
        const col = pos[i][1];

        for (let r = -2; r <= 2; r++) {
          for (let c = -2; c <= 2; c++) {
            if (r === -2 || r === 2 || c === -2 || c === 2 ||
              (r === 0 && c === 0)) {
              matrix.set(row + r, col + c, true, true);
            } else {
              matrix.set(row + r, col + c, false, true);
            }
          }
        }
      }
    }

    /**
     * Add version info bits to matrix
     *
     * @param  {BitMatrix} matrix  Modules matrix
     * @param  {Number}    version QR Code version
     */
    function setupVersionInfo (matrix, version$1) {
      const size = matrix.size;
      const bits = version.getEncodedBits(version$1);
      let row, col, mod;

      for (let i = 0; i < 18; i++) {
        row = Math.floor(i / 3);
        col = i % 3 + size - 8 - 3;
        mod = ((bits >> i) & 1) === 1;

        matrix.set(row, col, mod, true);
        matrix.set(col, row, mod, true);
      }
    }

    /**
     * Add format info bits to matrix
     *
     * @param  {BitMatrix} matrix               Modules matrix
     * @param  {ErrorCorrectionLevel}    errorCorrectionLevel Error correction level
     * @param  {Number}    maskPattern          Mask pattern reference value
     */
    function setupFormatInfo (matrix, errorCorrectionLevel, maskPattern) {
      const size = matrix.size;
      const bits = formatInfo.getEncodedBits(errorCorrectionLevel, maskPattern);
      let i, mod;

      for (i = 0; i < 15; i++) {
        mod = ((bits >> i) & 1) === 1;

        // vertical
        if (i < 6) {
          matrix.set(i, 8, mod, true);
        } else if (i < 8) {
          matrix.set(i + 1, 8, mod, true);
        } else {
          matrix.set(size - 15 + i, 8, mod, true);
        }

        // horizontal
        if (i < 8) {
          matrix.set(8, size - i - 1, mod, true);
        } else if (i < 9) {
          matrix.set(8, 15 - i - 1 + 1, mod, true);
        } else {
          matrix.set(8, 15 - i - 1, mod, true);
        }
      }

      // fixed module
      matrix.set(size - 8, 8, 1, true);
    }

    /**
     * Add encoded data bits to matrix
     *
     * @param  {BitMatrix}  matrix Modules matrix
     * @param  {Uint8Array} data   Data codewords
     */
    function setupData (matrix, data) {
      const size = matrix.size;
      let inc = -1;
      let row = size - 1;
      let bitIndex = 7;
      let byteIndex = 0;

      for (let col = size - 1; col > 0; col -= 2) {
        if (col === 6) col--;

        while (true) {
          for (let c = 0; c < 2; c++) {
            if (!matrix.isReserved(row, col - c)) {
              let dark = false;

              if (byteIndex < data.length) {
                dark = (((data[byteIndex] >>> bitIndex) & 1) === 1);
              }

              matrix.set(row, col - c, dark);
              bitIndex--;

              if (bitIndex === -1) {
                byteIndex++;
                bitIndex = 7;
              }
            }
          }

          row += inc;

          if (row < 0 || size <= row) {
            row -= inc;
            inc = -inc;
            break
          }
        }
      }
    }

    /**
     * Create encoded codewords from data input
     *
     * @param  {Number}   version              QR Code version
     * @param  {ErrorCorrectionLevel}   errorCorrectionLevel Error correction level
     * @param  {ByteData} data                 Data input
     * @return {Uint8Array}                    Buffer containing encoded codewords
     */
    function createData (version, errorCorrectionLevel, segments) {
      // Prepare data buffer
      const buffer = new bitBuffer();

      segments.forEach(function (data) {
        // prefix data with mode indicator (4 bits)
        buffer.put(data.mode.bit, 4);

        // Prefix data with character count indicator.
        // The character count indicator is a string of bits that represents the
        // number of characters that are being encoded.
        // The character count indicator must be placed after the mode indicator
        // and must be a certain number of bits long, depending on the QR version
        // and data mode
        // @see {@link Mode.getCharCountIndicator}.
        buffer.put(data.getLength(), mode.getCharCountIndicator(data.mode, version));

        // add binary data sequence to buffer
        data.write(buffer);
      });

      // Calculate required number of bits
      const totalCodewords = utils$1.getSymbolTotalCodewords(version);
      const ecTotalCodewords = errorCorrectionCode.getTotalCodewordsCount(version, errorCorrectionLevel);
      const dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;

      // Add a terminator.
      // If the bit string is shorter than the total number of required bits,
      // a terminator of up to four 0s must be added to the right side of the string.
      // If the bit string is more than four bits shorter than the required number of bits,
      // add four 0s to the end.
      if (buffer.getLengthInBits() + 4 <= dataTotalCodewordsBits) {
        buffer.put(0, 4);
      }

      // If the bit string is fewer than four bits shorter, add only the number of 0s that
      // are needed to reach the required number of bits.

      // After adding the terminator, if the number of bits in the string is not a multiple of 8,
      // pad the string on the right with 0s to make the string's length a multiple of 8.
      while (buffer.getLengthInBits() % 8 !== 0) {
        buffer.putBit(0);
      }

      // Add pad bytes if the string is still shorter than the total number of required bits.
      // Extend the buffer to fill the data capacity of the symbol corresponding to
      // the Version and Error Correction Level by adding the Pad Codewords 11101100 (0xEC)
      // and 00010001 (0x11) alternately.
      const remainingByte = (dataTotalCodewordsBits - buffer.getLengthInBits()) / 8;
      for (let i = 0; i < remainingByte; i++) {
        buffer.put(i % 2 ? 0x11 : 0xEC, 8);
      }

      return createCodewords(buffer, version, errorCorrectionLevel)
    }

    /**
     * Encode input data with Reed-Solomon and return codewords with
     * relative error correction bits
     *
     * @param  {BitBuffer} bitBuffer            Data to encode
     * @param  {Number}    version              QR Code version
     * @param  {ErrorCorrectionLevel} errorCorrectionLevel Error correction level
     * @return {Uint8Array}                     Buffer containing encoded codewords
     */
    function createCodewords (bitBuffer, version, errorCorrectionLevel) {
      // Total codewords for this QR code version (Data + Error correction)
      const totalCodewords = utils$1.getSymbolTotalCodewords(version);

      // Total number of error correction codewords
      const ecTotalCodewords = errorCorrectionCode.getTotalCodewordsCount(version, errorCorrectionLevel);

      // Total number of data codewords
      const dataTotalCodewords = totalCodewords - ecTotalCodewords;

      // Total number of blocks
      const ecTotalBlocks = errorCorrectionCode.getBlocksCount(version, errorCorrectionLevel);

      // Calculate how many blocks each group should contain
      const blocksInGroup2 = totalCodewords % ecTotalBlocks;
      const blocksInGroup1 = ecTotalBlocks - blocksInGroup2;

      const totalCodewordsInGroup1 = Math.floor(totalCodewords / ecTotalBlocks);

      const dataCodewordsInGroup1 = Math.floor(dataTotalCodewords / ecTotalBlocks);
      const dataCodewordsInGroup2 = dataCodewordsInGroup1 + 1;

      // Number of EC codewords is the same for both groups
      const ecCount = totalCodewordsInGroup1 - dataCodewordsInGroup1;

      // Initialize a Reed-Solomon encoder with a generator polynomial of degree ecCount
      const rs = new reedSolomonEncoder(ecCount);

      let offset = 0;
      const dcData = new Array(ecTotalBlocks);
      const ecData = new Array(ecTotalBlocks);
      let maxDataSize = 0;
      const buffer = new Uint8Array(bitBuffer.buffer);

      // Divide the buffer into the required number of blocks
      for (let b = 0; b < ecTotalBlocks; b++) {
        const dataSize = b < blocksInGroup1 ? dataCodewordsInGroup1 : dataCodewordsInGroup2;

        // extract a block of data from buffer
        dcData[b] = buffer.slice(offset, offset + dataSize);

        // Calculate EC codewords for this data block
        ecData[b] = rs.encode(dcData[b]);

        offset += dataSize;
        maxDataSize = Math.max(maxDataSize, dataSize);
      }

      // Create final data
      // Interleave the data and error correction codewords from each block
      const data = new Uint8Array(totalCodewords);
      let index = 0;
      let i, r;

      // Add data codewords
      for (i = 0; i < maxDataSize; i++) {
        for (r = 0; r < ecTotalBlocks; r++) {
          if (i < dcData[r].length) {
            data[index++] = dcData[r][i];
          }
        }
      }

      // Apped EC codewords
      for (i = 0; i < ecCount; i++) {
        for (r = 0; r < ecTotalBlocks; r++) {
          data[index++] = ecData[r][i];
        }
      }

      return data
    }

    /**
     * Build QR Code symbol
     *
     * @param  {String} data                 Input string
     * @param  {Number} version              QR Code version
     * @param  {ErrorCorretionLevel} errorCorrectionLevel Error level
     * @param  {MaskPattern} maskPattern     Mask pattern
     * @return {Object}                      Object containing symbol data
     */
    function createSymbol (data, version$1, errorCorrectionLevel, maskPattern$1) {
      let segments$1;

      if (Array.isArray(data)) {
        segments$1 = segments.fromArray(data);
      } else if (typeof data === 'string') {
        let estimatedVersion = version$1;

        if (!estimatedVersion) {
          const rawSegments = segments.rawSplit(data);

          // Estimate best version that can contain raw splitted segments
          estimatedVersion = version.getBestVersionForData(rawSegments, errorCorrectionLevel);
        }

        // Build optimized segments
        // If estimated version is undefined, try with the highest version
        segments$1 = segments.fromString(data, estimatedVersion || 40);
      } else {
        throw new Error('Invalid data')
      }

      // Get the min version that can contain data
      const bestVersion = version.getBestVersionForData(segments$1, errorCorrectionLevel);

      // If no version is found, data cannot be stored
      if (!bestVersion) {
        throw new Error('The amount of data is too big to be stored in a QR Code')
      }

      // If not specified, use min version as default
      if (!version$1) {
        version$1 = bestVersion;

      // Check if the specified version can contain the data
      } else if (version$1 < bestVersion) {
        throw new Error('\n' +
          'The chosen QR Code version cannot contain this amount of data.\n' +
          'Minimum version required to store current data is: ' + bestVersion + '.\n'
        )
      }

      const dataBits = createData(version$1, errorCorrectionLevel, segments$1);

      // Allocate matrix buffer
      const moduleCount = utils$1.getSymbolSize(version$1);
      const modules = new bitMatrix(moduleCount);

      // Add function modules
      setupFinderPattern(modules, version$1);
      setupTimingPattern(modules);
      setupAlignmentPattern(modules, version$1);

      // Add temporary dummy bits for format info just to set them as reserved.
      // This is needed to prevent these bits from being masked by {@link MaskPattern.applyMask}
      // since the masking operation must be performed only on the encoding region.
      // These blocks will be replaced with correct values later in code.
      setupFormatInfo(modules, errorCorrectionLevel, 0);

      if (version$1 >= 7) {
        setupVersionInfo(modules, version$1);
      }

      // Add data codewords
      setupData(modules, dataBits);

      if (isNaN(maskPattern$1)) {
        // Find best mask pattern
        maskPattern$1 = maskPattern.getBestMask(modules,
          setupFormatInfo.bind(null, modules, errorCorrectionLevel));
      }

      // Apply mask pattern
      maskPattern.applyMask(maskPattern$1, modules);

      // Replace format info bits with correct values
      setupFormatInfo(modules, errorCorrectionLevel, maskPattern$1);

      return {
        modules: modules,
        version: version$1,
        errorCorrectionLevel: errorCorrectionLevel,
        maskPattern: maskPattern$1,
        segments: segments$1
      }
    }

    /**
     * QR Code
     *
     * @param {String | Array} data                 Input data
     * @param {Object} options                      Optional configurations
     * @param {Number} options.version              QR Code version
     * @param {String} options.errorCorrectionLevel Error correction level
     * @param {Function} options.toSJISFunc         Helper func to convert utf8 to sjis
     */
    var create$1 = function create (data, options) {
      if (typeof data === 'undefined' || data === '') {
        throw new Error('No input text')
      }

      let errorCorrectionLevel$1 = errorCorrectionLevel.M;
      let version$1;
      let mask;

      if (typeof options !== 'undefined') {
        // Use higher error correction level as default
        errorCorrectionLevel$1 = errorCorrectionLevel.from(options.errorCorrectionLevel, errorCorrectionLevel.M);
        version$1 = version.from(options.version);
        mask = maskPattern.from(options.maskPattern);

        if (options.toSJISFunc) {
          utils$1.setToSJISFunction(options.toSJISFunc);
        }
      }

      return createSymbol(data, version$1, errorCorrectionLevel$1, mask)
    };

    var qrcode = {
    	create: create$1
    };

    var utils = createCommonjsModule(function (module, exports) {
    function hex2rgba (hex) {
      if (typeof hex === 'number') {
        hex = hex.toString();
      }

      if (typeof hex !== 'string') {
        throw new Error('Color should be defined as hex string')
      }

      let hexCode = hex.slice().replace('#', '').split('');
      if (hexCode.length < 3 || hexCode.length === 5 || hexCode.length > 8) {
        throw new Error('Invalid hex color: ' + hex)
      }

      // Convert from short to long form (fff -> ffffff)
      if (hexCode.length === 3 || hexCode.length === 4) {
        hexCode = Array.prototype.concat.apply([], hexCode.map(function (c) {
          return [c, c]
        }));
      }

      // Add default alpha value
      if (hexCode.length === 6) hexCode.push('F', 'F');

      const hexValue = parseInt(hexCode.join(''), 16);

      return {
        r: (hexValue >> 24) & 255,
        g: (hexValue >> 16) & 255,
        b: (hexValue >> 8) & 255,
        a: hexValue & 255,
        hex: '#' + hexCode.slice(0, 6).join('')
      }
    }

    exports.getOptions = function getOptions (options) {
      if (!options) options = {};
      if (!options.color) options.color = {};

      const margin = typeof options.margin === 'undefined' ||
        options.margin === null ||
        options.margin < 0
        ? 4
        : options.margin;

      const width = options.width && options.width >= 21 ? options.width : undefined;
      const scale = options.scale || 4;

      return {
        width: width,
        scale: width ? 4 : scale,
        margin: margin,
        color: {
          dark: hex2rgba(options.color.dark || '#000000ff'),
          light: hex2rgba(options.color.light || '#ffffffff')
        },
        type: options.type,
        rendererOpts: options.rendererOpts || {}
      }
    };

    exports.getScale = function getScale (qrSize, opts) {
      return opts.width && opts.width >= qrSize + opts.margin * 2
        ? opts.width / (qrSize + opts.margin * 2)
        : opts.scale
    };

    exports.getImageWidth = function getImageWidth (qrSize, opts) {
      const scale = exports.getScale(qrSize, opts);
      return Math.floor((qrSize + opts.margin * 2) * scale)
    };

    exports.qrToImageData = function qrToImageData (imgData, qr, opts) {
      const size = qr.modules.size;
      const data = qr.modules.data;
      const scale = exports.getScale(size, opts);
      const symbolSize = Math.floor((size + opts.margin * 2) * scale);
      const scaledMargin = opts.margin * scale;
      const palette = [opts.color.light, opts.color.dark];

      for (let i = 0; i < symbolSize; i++) {
        for (let j = 0; j < symbolSize; j++) {
          let posDst = (i * symbolSize + j) * 4;
          let pxColor = opts.color.light;

          if (i >= scaledMargin && j >= scaledMargin &&
            i < symbolSize - scaledMargin && j < symbolSize - scaledMargin) {
            const iSrc = Math.floor((i - scaledMargin) / scale);
            const jSrc = Math.floor((j - scaledMargin) / scale);
            pxColor = palette[data[iSrc * size + jSrc] ? 1 : 0];
          }

          imgData[posDst++] = pxColor.r;
          imgData[posDst++] = pxColor.g;
          imgData[posDst++] = pxColor.b;
          imgData[posDst] = pxColor.a;
        }
      }
    };
    });

    var canvas = createCommonjsModule(function (module, exports) {
    function clearCanvas (ctx, canvas, size) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!canvas.style) canvas.style = {};
      canvas.height = size;
      canvas.width = size;
      canvas.style.height = size + 'px';
      canvas.style.width = size + 'px';
    }

    function getCanvasElement () {
      try {
        return document.createElement('canvas')
      } catch (e) {
        throw new Error('You need to specify a canvas element')
      }
    }

    exports.render = function render (qrData, canvas, options) {
      let opts = options;
      let canvasEl = canvas;

      if (typeof opts === 'undefined' && (!canvas || !canvas.getContext)) {
        opts = canvas;
        canvas = undefined;
      }

      if (!canvas) {
        canvasEl = getCanvasElement();
      }

      opts = utils.getOptions(opts);
      const size = utils.getImageWidth(qrData.modules.size, opts);

      const ctx = canvasEl.getContext('2d');
      const image = ctx.createImageData(size, size);
      utils.qrToImageData(image.data, qrData, opts);

      clearCanvas(ctx, canvasEl, size);
      ctx.putImageData(image, 0, 0);

      return canvasEl
    };

    exports.renderToDataURL = function renderToDataURL (qrData, canvas, options) {
      let opts = options;

      if (typeof opts === 'undefined' && (!canvas || !canvas.getContext)) {
        opts = canvas;
        canvas = undefined;
      }

      if (!opts) opts = {};

      const canvasEl = exports.render(qrData, canvas, opts);

      const type = opts.type || 'image/png';
      const rendererOpts = opts.rendererOpts || {};

      return canvasEl.toDataURL(type, rendererOpts.quality)
    };
    });

    function getColorAttrib (color, attrib) {
      const alpha = color.a / 255;
      const str = attrib + '="' + color.hex + '"';

      return alpha < 1
        ? str + ' ' + attrib + '-opacity="' + alpha.toFixed(2).slice(1) + '"'
        : str
    }

    function svgCmd (cmd, x, y) {
      let str = cmd + x;
      if (typeof y !== 'undefined') str += ' ' + y;

      return str
    }

    function qrToPath (data, size, margin) {
      let path = '';
      let moveBy = 0;
      let newRow = false;
      let lineLength = 0;

      for (let i = 0; i < data.length; i++) {
        const col = Math.floor(i % size);
        const row = Math.floor(i / size);

        if (!col && !newRow) newRow = true;

        if (data[i]) {
          lineLength++;

          if (!(i > 0 && col > 0 && data[i - 1])) {
            path += newRow
              ? svgCmd('M', col + margin, 0.5 + row + margin)
              : svgCmd('m', moveBy, 0);

            moveBy = 0;
            newRow = false;
          }

          if (!(col + 1 < size && data[i + 1])) {
            path += svgCmd('h', lineLength);
            lineLength = 0;
          }
        } else {
          moveBy++;
        }
      }

      return path
    }

    var render = function render (qrData, options, cb) {
      const opts = utils.getOptions(options);
      const size = qrData.modules.size;
      const data = qrData.modules.data;
      const qrcodesize = size + opts.margin * 2;

      const bg = !opts.color.light.a
        ? ''
        : '<path ' + getColorAttrib(opts.color.light, 'fill') +
          ' d="M0 0h' + qrcodesize + 'v' + qrcodesize + 'H0z"/>';

      const path =
        '<path ' + getColorAttrib(opts.color.dark, 'stroke') +
        ' d="' + qrToPath(data, size, opts.margin) + '"/>';

      const viewBox = 'viewBox="' + '0 0 ' + qrcodesize + ' ' + qrcodesize + '"';

      const width = !opts.width ? '' : 'width="' + opts.width + '" height="' + opts.width + '" ';

      const svgTag = '<svg xmlns="http://www.w3.org/2000/svg" ' + width + viewBox + ' shape-rendering="crispEdges">' + bg + path + '</svg>\n';

      if (typeof cb === 'function') {
        cb(null, svgTag);
      }

      return svgTag
    };

    var svgTag = {
    	render: render
    };

    function renderCanvas (renderFunc, canvas, text, opts, cb) {
      const args = [].slice.call(arguments, 1);
      const argsNum = args.length;
      const isLastArgCb = typeof args[argsNum - 1] === 'function';

      if (!isLastArgCb && !canPromise()) {
        throw new Error('Callback required as last argument')
      }

      if (isLastArgCb) {
        if (argsNum < 2) {
          throw new Error('Too few arguments provided')
        }

        if (argsNum === 2) {
          cb = text;
          text = canvas;
          canvas = opts = undefined;
        } else if (argsNum === 3) {
          if (canvas.getContext && typeof cb === 'undefined') {
            cb = opts;
            opts = undefined;
          } else {
            cb = opts;
            opts = text;
            text = canvas;
            canvas = undefined;
          }
        }
      } else {
        if (argsNum < 1) {
          throw new Error('Too few arguments provided')
        }

        if (argsNum === 1) {
          text = canvas;
          canvas = opts = undefined;
        } else if (argsNum === 2 && !canvas.getContext) {
          opts = text;
          text = canvas;
          canvas = undefined;
        }

        return new Promise(function (resolve, reject) {
          try {
            const data = qrcode.create(text, opts);
            resolve(renderFunc(data, canvas, opts));
          } catch (e) {
            reject(e);
          }
        })
      }

      try {
        const data = qrcode.create(text, opts);
        cb(null, renderFunc(data, canvas, opts));
      } catch (e) {
        cb(e);
      }
    }

    var create = qrcode.create;
    var toCanvas = renderCanvas.bind(null, canvas.render);
    var toDataURL = renderCanvas.bind(null, canvas.renderToDataURL);

    // only svg for now.
    var toString = renderCanvas.bind(null, function (data, _, opts) {
      return svgTag.render(data, opts)
    });

    var browser = {
    	create: create,
    	toCanvas: toCanvas,
    	toDataURL: toDataURL,
    	toString: toString
    };

    const str = '00020101021151260022000000790020953869234730150011ar.com.uala50150011209538692345204481653030325802AR5925Kevin limber Butron salga6007Palermo610411116217051362a3cbdb0897563043A73';

    let element = '';

    browser.toString(str,{type:'terminal'}, function (err, url) {
    	return element = url;
    });

    /* src/QRJS.svelte generated by Svelte v3.48.0 */
    const file$9 = "src/QRJS.svelte";

    function create_fragment$9(ctx) {
    	let div;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element$1("div");
    			attr_dev(div, "contenteditable", "true");
    			attr_dev(div, "class", "svelte-17lq269");
    			if (/*qr*/ ctx[0] === void 0) add_render_callback(() => /*div_input_handler*/ ctx[1].call(div));
    			add_location(div, file$9, 5, 0, 80);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (/*qr*/ ctx[0] !== void 0) {
    				div.innerHTML = /*qr*/ ctx[0];
    			}

    			if (!mounted) {
    				dispose = listen_dev(div, "input", /*div_input_handler*/ ctx[1]);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*qr*/ 1 && /*qr*/ ctx[0] !== div.innerHTML) {
    				div.innerHTML = /*qr*/ ctx[0];
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('QRJS', slots, []);
    	let qr = element;
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<QRJS> was created with unknown prop '${key}'`);
    	});

    	function div_input_handler() {
    		qr = this.innerHTML;
    		$$invalidate(0, qr);
    	}

    	$$self.$capture_state = () => ({ element, qr });

    	$$self.$inject_state = $$props => {
    		if ('qr' in $$props) $$invalidate(0, qr = $$props.qr);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [qr, div_input_handler];
    }

    class QRJS extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "QRJS",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* src/Copy.svelte generated by Svelte v3.48.0 */

    const file$8 = "src/Copy.svelte";

    function create_fragment$8(ctx) {
    	let div;
    	let span0;
    	let t0;
    	let t1;
    	let span1;
    	let t2;
    	let t3;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element$1("div");
    			span0 = element$1("span");
    			t0 = text(/*type*/ ctx[0]);
    			t1 = space();
    			span1 = element$1("span");
    			t2 = text(/*ctx*/ ctx[1]);
    			t3 = space();
    			button = element$1("button");
    			button.textContent = "Copy";
    			add_location(span0, file$8, 9, 2, 214);
    			set_style(span1, "border", `0.13em outset #fff`, false);
    			set_style(span1, "border-radius", `0.5em`, false);
    			set_style(span1, "padding", `0.2em 0.4em`, false);
    			set_style(span1, "color", `#fff`, false);
    			add_location(span1, file$8, 10, 2, 236);
    			attr_dev(button, "class", "svelte-1vu2us2");
    			add_location(button, file$8, 16, 2, 402);
    			attr_dev(div, "class", "svelte-1vu2us2");
    			add_location(div, file$8, 8, 0, 206);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span0);
    			append_dev(span0, t0);
    			append_dev(div, t1);
    			append_dev(div, span1);
    			append_dev(span1, t2);
    			/*span1_binding*/ ctx[4](span1);
    			append_dev(div, t3);
    			append_dev(div, button);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", /*click_handler*/ ctx[5], false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*type*/ 1) set_data_dev(t0, /*type*/ ctx[0]);
    			if (dirty & /*ctx*/ 2) set_data_dev(t2, /*ctx*/ ctx[1]);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			/*span1_binding*/ ctx[4](null);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Copy', slots, []);
    	let { type = 'TEXT:' } = $$props;
    	let { ctx = 'Coppied...' } = $$props;
    	let element;

    	const copyText = async value => {
    		return await navigator.clipboard.writeText(value.textContent);
    	};

    	const writable_props = ['type', 'ctx'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Copy> was created with unknown prop '${key}'`);
    	});

    	function span1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			element = $$value;
    			$$invalidate(2, element);
    		});
    	}

    	const click_handler = () => copyText(element);

    	$$self.$$set = $$props => {
    		if ('type' in $$props) $$invalidate(0, type = $$props.type);
    		if ('ctx' in $$props) $$invalidate(1, ctx = $$props.ctx);
    	};

    	$$self.$capture_state = () => ({ type, ctx, element, copyText });

    	$$self.$inject_state = $$props => {
    		if ('type' in $$props) $$invalidate(0, type = $$props.type);
    		if ('ctx' in $$props) $$invalidate(1, ctx = $$props.ctx);
    		if ('element' in $$props) $$invalidate(2, element = $$props.element);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [type, ctx, element, copyText, span1_binding, click_handler];
    }

    class Copy extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, { type: 0, ctx: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Copy",
    			options,
    			id: create_fragment$8.name
    		});
    	}

    	get type() {
    		throw new Error("<Copy>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<Copy>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get ctx() {
    		throw new Error("<Copy>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set ctx(value) {
    		throw new Error("<Copy>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    // This file is a workaround for a bug in web browsers' "native"
    // ES6 importing system which is uncapable of importing "*.json" files.
    // https://github.com/catamphetamine/libphonenumber-js/issues/239
    var metadata = {"version":4,"country_calling_codes":{"1":["US","AG","AI","AS","BB","BM","BS","CA","DM","DO","GD","GU","JM","KN","KY","LC","MP","MS","PR","SX","TC","TT","VC","VG","VI"],"7":["RU","KZ"],"20":["EG"],"27":["ZA"],"30":["GR"],"31":["NL"],"32":["BE"],"33":["FR"],"34":["ES"],"36":["HU"],"39":["IT","VA"],"40":["RO"],"41":["CH"],"43":["AT"],"44":["GB","GG","IM","JE"],"45":["DK"],"46":["SE"],"47":["NO","SJ"],"48":["PL"],"49":["DE"],"51":["PE"],"52":["MX"],"53":["CU"],"54":["AR"],"55":["BR"],"56":["CL"],"57":["CO"],"58":["VE"],"60":["MY"],"61":["AU","CC","CX"],"62":["ID"],"63":["PH"],"64":["NZ"],"65":["SG"],"66":["TH"],"81":["JP"],"82":["KR"],"84":["VN"],"86":["CN"],"90":["TR"],"91":["IN"],"92":["PK"],"93":["AF"],"94":["LK"],"95":["MM"],"98":["IR"],"211":["SS"],"212":["MA","EH"],"213":["DZ"],"216":["TN"],"218":["LY"],"220":["GM"],"221":["SN"],"222":["MR"],"223":["ML"],"224":["GN"],"225":["CI"],"226":["BF"],"227":["NE"],"228":["TG"],"229":["BJ"],"230":["MU"],"231":["LR"],"232":["SL"],"233":["GH"],"234":["NG"],"235":["TD"],"236":["CF"],"237":["CM"],"238":["CV"],"239":["ST"],"240":["GQ"],"241":["GA"],"242":["CG"],"243":["CD"],"244":["AO"],"245":["GW"],"246":["IO"],"247":["AC"],"248":["SC"],"249":["SD"],"250":["RW"],"251":["ET"],"252":["SO"],"253":["DJ"],"254":["KE"],"255":["TZ"],"256":["UG"],"257":["BI"],"258":["MZ"],"260":["ZM"],"261":["MG"],"262":["RE","YT"],"263":["ZW"],"264":["NA"],"265":["MW"],"266":["LS"],"267":["BW"],"268":["SZ"],"269":["KM"],"290":["SH","TA"],"291":["ER"],"297":["AW"],"298":["FO"],"299":["GL"],"350":["GI"],"351":["PT"],"352":["LU"],"353":["IE"],"354":["IS"],"355":["AL"],"356":["MT"],"357":["CY"],"358":["FI","AX"],"359":["BG"],"370":["LT"],"371":["LV"],"372":["EE"],"373":["MD"],"374":["AM"],"375":["BY"],"376":["AD"],"377":["MC"],"378":["SM"],"380":["UA"],"381":["RS"],"382":["ME"],"383":["XK"],"385":["HR"],"386":["SI"],"387":["BA"],"389":["MK"],"420":["CZ"],"421":["SK"],"423":["LI"],"500":["FK"],"501":["BZ"],"502":["GT"],"503":["SV"],"504":["HN"],"505":["NI"],"506":["CR"],"507":["PA"],"508":["PM"],"509":["HT"],"590":["GP","BL","MF"],"591":["BO"],"592":["GY"],"593":["EC"],"594":["GF"],"595":["PY"],"596":["MQ"],"597":["SR"],"598":["UY"],"599":["CW","BQ"],"670":["TL"],"672":["NF"],"673":["BN"],"674":["NR"],"675":["PG"],"676":["TO"],"677":["SB"],"678":["VU"],"679":["FJ"],"680":["PW"],"681":["WF"],"682":["CK"],"683":["NU"],"685":["WS"],"686":["KI"],"687":["NC"],"688":["TV"],"689":["PF"],"690":["TK"],"691":["FM"],"692":["MH"],"850":["KP"],"852":["HK"],"853":["MO"],"855":["KH"],"856":["LA"],"880":["BD"],"886":["TW"],"960":["MV"],"961":["LB"],"962":["JO"],"963":["SY"],"964":["IQ"],"965":["KW"],"966":["SA"],"967":["YE"],"968":["OM"],"970":["PS"],"971":["AE"],"972":["IL"],"973":["BH"],"974":["QA"],"975":["BT"],"976":["MN"],"977":["NP"],"992":["TJ"],"993":["TM"],"994":["AZ"],"995":["GE"],"996":["KG"],"998":["UZ"]},"countries":{"AC":["247","00","(?:[01589]\\d|[46])\\d{4}",[5,6]],"AD":["376","00","(?:1|6\\d)\\d{7}|[135-9]\\d{5}",[6,8,9],[["(\\d{3})(\\d{3})","$1 $2",["[135-9]"]],["(\\d{4})(\\d{4})","$1 $2",["1"]],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["6"]]]],"AE":["971","00","(?:[4-7]\\d|9[0-689])\\d{7}|800\\d{2,9}|[2-4679]\\d{7}",[5,6,7,8,9,10,11,12],[["(\\d{3})(\\d{2,9})","$1 $2",["60|8"]],["(\\d)(\\d{3})(\\d{4})","$1 $2 $3",["[236]|[479][2-8]"],"0$1"],["(\\d{3})(\\d)(\\d{5})","$1 $2 $3",["[479]"]],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["5"],"0$1"]],"0"],"AF":["93","00","[2-7]\\d{8}",[9],[["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["[2-7]"],"0$1"]],"0"],"AG":["1","011","(?:268|[58]\\d\\d|900)\\d{7}",[10],0,"1",0,"1|([457]\\d{6})$","268$1",0,"268"],"AI":["1","011","(?:264|[58]\\d\\d|900)\\d{7}",[10],0,"1",0,"1|([2457]\\d{6})$","264$1",0,"264"],"AL":["355","00","(?:700\\d\\d|900)\\d{3}|8\\d{5,7}|(?:[2-5]|6\\d)\\d{7}",[6,7,8,9],[["(\\d{3})(\\d{3,4})","$1 $2",["80|9"],"0$1"],["(\\d)(\\d{3})(\\d{4})","$1 $2 $3",["4[2-6]"],"0$1"],["(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3",["[2358][2-5]|4"],"0$1"],["(\\d{3})(\\d{5})","$1 $2",["[23578]"],"0$1"],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["6"],"0$1"]],"0"],"AM":["374","00","(?:[1-489]\\d|55|60|77)\\d{6}",[8],[["(\\d{3})(\\d{2})(\\d{3})","$1 $2 $3",["[89]0"],"0 $1"],["(\\d{3})(\\d{5})","$1 $2",["2|3[12]"],"(0$1)"],["(\\d{2})(\\d{6})","$1 $2",["1|47"],"(0$1)"],["(\\d{2})(\\d{6})","$1 $2",["[3-9]"],"0$1"]],"0"],"AO":["244","00","[29]\\d{8}",[9],[["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[29]"]]]],"AR":["54","00","(?:11|[89]\\d\\d)\\d{8}|[2368]\\d{9}",[10,11],[["(\\d{4})(\\d{2})(\\d{4})","$1 $2-$3",["2(?:2[024-9]|3[0-59]|47|6[245]|9[02-8])|3(?:3[28]|4[03-9]|5[2-46-8]|7[1-578]|8[2-9])","2(?:[23]02|6(?:[25]|4[6-8])|9(?:[02356]|4[02568]|72|8[23]))|3(?:3[28]|4(?:[04679]|3[5-8]|5[4-68]|8[2379])|5(?:[2467]|3[237]|8[2-5])|7[1-578]|8(?:[2469]|3[2578]|5[4-8]|7[36-8]|8[5-8]))|2(?:2[24-9]|3[1-59]|47)","2(?:[23]02|6(?:[25]|4(?:64|[78]))|9(?:[02356]|4(?:[0268]|5[2-6])|72|8[23]))|3(?:3[28]|4(?:[04679]|3[78]|5(?:4[46]|8)|8[2379])|5(?:[2467]|3[237]|8[23])|7[1-578]|8(?:[2469]|3[278]|5[56][46]|86[3-6]))|2(?:2[24-9]|3[1-59]|47)|38(?:[58][78]|7[378])|3(?:4[35][56]|58[45]|8(?:[38]5|54|76))[4-6]","2(?:[23]02|6(?:[25]|4(?:64|[78]))|9(?:[02356]|4(?:[0268]|5[2-6])|72|8[23]))|3(?:3[28]|4(?:[04679]|3(?:5(?:4[0-25689]|[56])|[78])|58|8[2379])|5(?:[2467]|3[237]|8(?:[23]|4(?:[45]|60)|5(?:4[0-39]|5|64)))|7[1-578]|8(?:[2469]|3[278]|54(?:4|5[13-7]|6[89])|86[3-6]))|2(?:2[24-9]|3[1-59]|47)|38(?:[58][78]|7[378])|3(?:454|85[56])[46]|3(?:4(?:36|5[56])|8(?:[38]5|76))[4-6]"],"0$1",1],["(\\d{2})(\\d{4})(\\d{4})","$1 $2-$3",["1"],"0$1",1],["(\\d{3})(\\d{3})(\\d{4})","$1-$2-$3",["[68]"],"0$1"],["(\\d{3})(\\d{3})(\\d{4})","$1 $2-$3",["[23]"],"0$1",1],["(\\d)(\\d{4})(\\d{2})(\\d{4})","$2 15-$3-$4",["9(?:2[2-469]|3[3-578])","9(?:2(?:2[024-9]|3[0-59]|47|6[245]|9[02-8])|3(?:3[28]|4[03-9]|5[2-46-8]|7[1-578]|8[2-9]))","9(?:2(?:[23]02|6(?:[25]|4[6-8])|9(?:[02356]|4[02568]|72|8[23]))|3(?:3[28]|4(?:[04679]|3[5-8]|5[4-68]|8[2379])|5(?:[2467]|3[237]|8[2-5])|7[1-578]|8(?:[2469]|3[2578]|5[4-8]|7[36-8]|8[5-8])))|92(?:2[24-9]|3[1-59]|47)","9(?:2(?:[23]02|6(?:[25]|4(?:64|[78]))|9(?:[02356]|4(?:[0268]|5[2-6])|72|8[23]))|3(?:3[28]|4(?:[04679]|3[78]|5(?:4[46]|8)|8[2379])|5(?:[2467]|3[237]|8[23])|7[1-578]|8(?:[2469]|3[278]|5(?:[56][46]|[78])|7[378]|8(?:6[3-6]|[78]))))|92(?:2[24-9]|3[1-59]|47)|93(?:4[35][56]|58[45]|8(?:[38]5|54|76))[4-6]","9(?:2(?:[23]02|6(?:[25]|4(?:64|[78]))|9(?:[02356]|4(?:[0268]|5[2-6])|72|8[23]))|3(?:3[28]|4(?:[04679]|3(?:5(?:4[0-25689]|[56])|[78])|5(?:4[46]|8)|8[2379])|5(?:[2467]|3[237]|8(?:[23]|4(?:[45]|60)|5(?:4[0-39]|5|64)))|7[1-578]|8(?:[2469]|3[278]|5(?:4(?:4|5[13-7]|6[89])|[56][46]|[78])|7[378]|8(?:6[3-6]|[78]))))|92(?:2[24-9]|3[1-59]|47)|93(?:4(?:36|5[56])|8(?:[38]5|76))[4-6]"],"0$1",0,"$1 $2 $3-$4"],["(\\d)(\\d{2})(\\d{4})(\\d{4})","$2 15-$3-$4",["91"],"0$1",0,"$1 $2 $3-$4"],["(\\d{3})(\\d{3})(\\d{5})","$1-$2-$3",["8"],"0$1"],["(\\d)(\\d{3})(\\d{3})(\\d{4})","$2 15-$3-$4",["9"],"0$1",0,"$1 $2 $3-$4"]],"0",0,"0?(?:(11|2(?:2(?:02?|[13]|2[13-79]|4[1-6]|5[2457]|6[124-8]|7[1-4]|8[13-6]|9[1267])|3(?:02?|1[467]|2[03-6]|3[13-8]|[49][2-6]|5[2-8]|[67])|4(?:7[3-578]|9)|6(?:[0136]|2[24-6]|4[6-8]?|5[15-8])|80|9(?:0[1-3]|[19]|2\\d|3[1-6]|4[02568]?|5[2-4]|6[2-46]|72?|8[23]?))|3(?:3(?:2[79]|6|8[2578])|4(?:0[0-24-9]|[12]|3[5-8]?|4[24-7]|5[4-68]?|6[02-9]|7[126]|8[2379]?|9[1-36-8])|5(?:1|2[1245]|3[237]?|4[1-46-9]|6[2-4]|7[1-6]|8[2-5]?)|6[24]|7(?:[069]|1[1568]|2[15]|3[145]|4[13]|5[14-8]|7[2-57]|8[126])|8(?:[01]|2[15-7]|3[2578]?|4[13-6]|5[4-8]?|6[1-357-9]|7[36-8]?|8[5-8]?|9[124])))15)?","9$1"],"AS":["1","011","(?:[58]\\d\\d|684|900)\\d{7}",[10],0,"1",0,"1|([267]\\d{6})$","684$1",0,"684"],"AT":["43","00","1\\d{3,12}|2\\d{6,12}|43(?:(?:0\\d|5[02-9])\\d{3,9}|2\\d{4,5}|[3467]\\d{4}|8\\d{4,6}|9\\d{4,7})|5\\d{4,12}|8\\d{7,12}|9\\d{8,12}|(?:[367]\\d|4[0-24-9])\\d{4,11}",[4,5,6,7,8,9,10,11,12,13],[["(\\d)(\\d{3,12})","$1 $2",["1(?:11|[2-9])"],"0$1"],["(\\d{3})(\\d{2})","$1 $2",["517"],"0$1"],["(\\d{2})(\\d{3,5})","$1 $2",["5[079]"],"0$1"],["(\\d{3})(\\d{3,10})","$1 $2",["(?:31|4)6|51|6(?:5[0-3579]|[6-9])|7(?:20|32|8)|[89]"],"0$1"],["(\\d{4})(\\d{3,9})","$1 $2",["[2-467]|5[2-6]"],"0$1"],["(\\d{2})(\\d{3})(\\d{3,4})","$1 $2 $3",["5"],"0$1"],["(\\d{2})(\\d{4})(\\d{4,7})","$1 $2 $3",["5"],"0$1"]],"0"],"AU":["61","001[14-689]|14(?:1[14]|34|4[17]|[56]6|7[47]|88)0011","1(?:[0-79]\\d{7}(?:\\d(?:\\d{2})?)?|8[0-24-9]\\d{7})|[2-478]\\d{8}|1\\d{4,7}",[5,6,7,8,9,10,12],[["(\\d{2})(\\d{3,4})","$1 $2",["16"],"0$1"],["(\\d{2})(\\d{3})(\\d{2,4})","$1 $2 $3",["16"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["14|4"],"0$1"],["(\\d)(\\d{4})(\\d{4})","$1 $2 $3",["[2378]"],"(0$1)"],["(\\d{4})(\\d{3})(\\d{3})","$1 $2 $3",["1(?:30|[89])"]]],"0",0,"0|(183[12])",0,0,0,[["(?:(?:2(?:[0-26-9]\\d|3[0-8]|4[02-9]|5[0135-9])|3(?:[0-3589]\\d|4[0-578]|6[1-9]|7[0-35-9])|7(?:[013-57-9]\\d|2[0-8]))\\d{3}|8(?:51(?:0(?:0[03-9]|[12479]\\d|3[2-9]|5[0-8]|6[1-9]|8[0-7])|1(?:[0235689]\\d|1[0-69]|4[0-589]|7[0-47-9])|2(?:0[0-79]|[18][13579]|2[14-9]|3[0-46-9]|[4-6]\\d|7[89]|9[0-4]))|(?:6[0-8]|[78]\\d)\\d{3}|9(?:[02-9]\\d{3}|1(?:(?:[0-58]\\d|6[0135-9])\\d|7(?:0[0-24-9]|[1-9]\\d)|9(?:[0-46-9]\\d|5[0-79])))))\\d{3}",[9]],["4(?:83[0-38]|93[0-6])\\d{5}|4(?:[0-3]\\d|4[047-9]|5[0-25-9]|6[06-9]|7[02-9]|8[0-24-9]|9[0-27-9])\\d{6}",[9]],["180(?:0\\d{3}|2)\\d{3}",[7,10]],["190[0-26]\\d{6}",[10]],0,0,0,["163\\d{2,6}",[5,6,7,8,9]],["14(?:5(?:1[0458]|[23][458])|71\\d)\\d{4}",[9]],["13(?:00\\d{6}(?:\\d{2})?|45[0-4]\\d{3})|13\\d{4}",[6,8,10,12]]],"0011"],"AW":["297","00","(?:[25-79]\\d\\d|800)\\d{4}",[7],[["(\\d{3})(\\d{4})","$1 $2",["[25-9]"]]]],"AX":["358","00|99(?:[01469]|5(?:[14]1|3[23]|5[59]|77|88|9[09]))","2\\d{4,9}|35\\d{4,5}|(?:60\\d\\d|800)\\d{4,6}|7\\d{5,11}|(?:[14]\\d|3[0-46-9]|50)\\d{4,8}",[5,6,7,8,9,10,11,12],0,"0",0,0,0,0,"18",0,"00"],"AZ":["994","00","365\\d{6}|(?:[124579]\\d|60|88)\\d{7}",[9],[["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["90"],"0$1"],["(\\d{2})(\\d{3})(\\d{2})(\\d{2})","$1 $2 $3 $4",["1[28]|2|365|46","1[28]|2|365[45]|46","1[28]|2|365(?:4|5[02])|46"],"(0$1)"],["(\\d{2})(\\d{3})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[13-9]"],"0$1"]],"0"],"BA":["387","00","6\\d{8}|(?:[35689]\\d|49|70)\\d{6}",[8,9],[["(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3",["6[1-3]|[7-9]"],"0$1"],["(\\d{2})(\\d{3})(\\d{3})","$1 $2-$3",["[3-5]|6[56]"],"0$1"],["(\\d{2})(\\d{2})(\\d{2})(\\d{3})","$1 $2 $3 $4",["6"],"0$1"]],"0"],"BB":["1","011","(?:246|[58]\\d\\d|900)\\d{7}",[10],0,"1",0,"1|([2-9]\\d{6})$","246$1",0,"246"],"BD":["880","00","[1-469]\\d{9}|8[0-79]\\d{7,8}|[2-79]\\d{8}|[2-9]\\d{7}|[3-9]\\d{6}|[57-9]\\d{5}",[6,7,8,9,10],[["(\\d{2})(\\d{4,6})","$1-$2",["31[5-8]|[459]1"],"0$1"],["(\\d{3})(\\d{3,7})","$1-$2",["3(?:[67]|8[013-9])|4(?:6[168]|7|[89][18])|5(?:6[128]|9)|6(?:28|4[14]|5)|7[2-589]|8(?:0[014-9]|[12])|9[358]|(?:3[2-5]|4[235]|5[2-578]|6[0389]|76|8[3-7]|9[24])1|(?:44|66)[01346-9]"],"0$1"],["(\\d{4})(\\d{3,6})","$1-$2",["[13-9]|22"],"0$1"],["(\\d)(\\d{7,8})","$1-$2",["2"],"0$1"]],"0"],"BE":["32","00","4\\d{8}|[1-9]\\d{7}",[8,9],[["(\\d{3})(\\d{2})(\\d{3})","$1 $2 $3",["(?:80|9)0"],"0$1"],["(\\d)(\\d{3})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[239]|4[23]"],"0$1"],["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[15-8]"],"0$1"],["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["4"],"0$1"]],"0"],"BF":["226","00","[025-7]\\d{7}",[8],[["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[025-7]"]]]],"BG":["359","00","[2-7]\\d{6,7}|[89]\\d{6,8}|2\\d{5}",[6,7,8,9],[["(\\d)(\\d)(\\d{2})(\\d{2})","$1 $2 $3 $4",["2"],"0$1"],["(\\d{3})(\\d{4})","$1 $2",["43[1-6]|70[1-9]"],"0$1"],["(\\d)(\\d{3})(\\d{3,4})","$1 $2 $3",["2"],"0$1"],["(\\d{2})(\\d{3})(\\d{2,3})","$1 $2 $3",["[356]|4[124-7]|7[1-9]|8[1-6]|9[1-7]"],"0$1"],["(\\d{3})(\\d{2})(\\d{3})","$1 $2 $3",["(?:70|8)0"],"0$1"],["(\\d{3})(\\d{3})(\\d{2})","$1 $2 $3",["43[1-7]|7"],"0$1"],["(\\d{2})(\\d{3})(\\d{3,4})","$1 $2 $3",["[48]|9[08]"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["9"],"0$1"]],"0"],"BH":["973","00","[136-9]\\d{7}",[8],[["(\\d{4})(\\d{4})","$1 $2",["[13679]|8[047]"]]]],"BI":["257","00","(?:[267]\\d|31)\\d{6}",[8],[["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[2367]"]]]],"BJ":["229","00","(?:[25689]\\d|40)\\d{6}",[8],[["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[24-689]"]]]],"BL":["590","00","(?:590|(?:69|80)\\d|976)\\d{6}",[9],0,"0",0,0,0,0,0,[["590(?:2[7-9]|5[12]|87)\\d{4}"],["69(?:0\\d\\d|1(?:2[2-9]|3[0-5]))\\d{4}"],["80[0-5]\\d{6}"],0,0,0,0,0,["976[01]\\d{5}"]]],"BM":["1","011","(?:441|[58]\\d\\d|900)\\d{7}",[10],0,"1",0,"1|([2-8]\\d{6})$","441$1",0,"441"],"BN":["673","00","[2-578]\\d{6}",[7],[["(\\d{3})(\\d{4})","$1 $2",["[2-578]"]]]],"BO":["591","00(?:1\\d)?","(?:[2-467]\\d\\d|8001)\\d{5}",[8,9],[["(\\d)(\\d{7})","$1 $2",["[23]|4[46]"]],["(\\d{8})","$1",["[67]"]],["(\\d{3})(\\d{2})(\\d{4})","$1 $2 $3",["8"]]],"0",0,"0(1\\d)?"],"BQ":["599","00","(?:[34]1|7\\d)\\d{5}",[7],0,0,0,0,0,0,"[347]"],"BR":["55","00(?:1[245]|2[1-35]|31|4[13]|[56]5|99)","(?:[1-46-9]\\d\\d|5(?:[0-46-9]\\d|5[0-24679]))\\d{8}|[1-9]\\d{9}|[3589]\\d{8}|[34]\\d{7}",[8,9,10,11],[["(\\d{4})(\\d{4})","$1-$2",["300|4(?:0[02]|37)","4(?:02|37)0|[34]00"]],["(\\d{3})(\\d{2,3})(\\d{4})","$1 $2 $3",["(?:[358]|90)0"],"0$1"],["(\\d{2})(\\d{4})(\\d{4})","$1 $2-$3",["(?:[14689][1-9]|2[12478]|3[1-578]|5[13-5]|7[13-579])[2-57]"],"($1)"],["(\\d{2})(\\d{5})(\\d{4})","$1 $2-$3",["[16][1-9]|[2-57-9]"],"($1)"]],"0",0,"(?:0|90)(?:(1[245]|2[1-35]|31|4[13]|[56]5|99)(\\d{10,11}))?","$2"],"BS":["1","011","(?:242|[58]\\d\\d|900)\\d{7}",[10],0,"1",0,"1|([3-8]\\d{6})$","242$1",0,"242"],"BT":["975","00","[17]\\d{7}|[2-8]\\d{6}",[7,8],[["(\\d)(\\d{3})(\\d{3})","$1 $2 $3",["[2-68]|7[246]"]],["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["1[67]|7"]]]],"BW":["267","00","(?:0800|(?:[37]|800)\\d)\\d{6}|(?:[2-6]\\d|90)\\d{5}",[7,8,10],[["(\\d{2})(\\d{5})","$1 $2",["90"]],["(\\d{3})(\\d{4})","$1 $2",["[24-6]|3[15-79]"]],["(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3",["[37]"]],["(\\d{4})(\\d{3})(\\d{3})","$1 $2 $3",["0"]],["(\\d{3})(\\d{4})(\\d{3})","$1 $2 $3",["8"]]]],"BY":["375","810","(?:[12]\\d|33|44|902)\\d{7}|8(?:0[0-79]\\d{5,7}|[1-7]\\d{9})|8(?:1[0-489]|[5-79]\\d)\\d{7}|8[1-79]\\d{6,7}|8[0-79]\\d{5}|8\\d{5}",[6,7,8,9,10,11],[["(\\d{3})(\\d{3})","$1 $2",["800"],"8 $1"],["(\\d{3})(\\d{2})(\\d{2,4})","$1 $2 $3",["800"],"8 $1"],["(\\d{4})(\\d{2})(\\d{3})","$1 $2-$3",["1(?:5[169]|6[3-5]|7[179])|2(?:1[35]|2[34]|3[3-5])","1(?:5[169]|6(?:3[1-3]|4|5[125])|7(?:1[3-9]|7[0-24-6]|9[2-7]))|2(?:1[35]|2[34]|3[3-5])"],"8 0$1"],["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2-$3-$4",["1(?:[56]|7[467])|2[1-3]"],"8 0$1"],["(\\d{2})(\\d{3})(\\d{2})(\\d{2})","$1 $2-$3-$4",["[1-4]"],"8 0$1"],["(\\d{3})(\\d{3,4})(\\d{4})","$1 $2 $3",["[89]"],"8 $1"]],"8",0,"0|80?",0,0,0,0,"8~10"],"BZ":["501","00","(?:0800\\d|[2-8])\\d{6}",[7,11],[["(\\d{3})(\\d{4})","$1-$2",["[2-8]"]],["(\\d)(\\d{3})(\\d{4})(\\d{3})","$1-$2-$3-$4",["0"]]]],"CA":["1","011","(?:[2-8]\\d|90)\\d{8}|3\\d{6}",[7,10],0,"1",0,0,0,0,0,[["(?:2(?:04|[23]6|[48]9|50|63)|3(?:06|43|6[578])|4(?:03|1[68]|3[178]|50|68|74)|5(?:06|1[49]|48|79|8[147])|6(?:04|13|39|47|72)|7(?:0[59]|78|8[02])|8(?:[06]7|19|25|73)|90[25])[2-9]\\d{6}",[10]],["",[10]],["8(?:00|33|44|55|66|77|88)[2-9]\\d{6}",[10]],["900[2-9]\\d{6}",[10]],["52(?:3(?:[2-46-9][02-9]\\d|5(?:[02-46-9]\\d|5[0-46-9]))|4(?:[2-478][02-9]\\d|5(?:[034]\\d|2[024-9]|5[0-46-9])|6(?:0[1-9]|[2-9]\\d)|9(?:[05-9]\\d|2[0-5]|49)))\\d{4}|52[34][2-9]1[02-9]\\d{4}|(?:5(?:00|2[125-7]|33|44|66|77|88)|622)[2-9]\\d{6}",[10]],0,["310\\d{4}",[7]],0,["600[2-9]\\d{6}",[10]]]],"CC":["61","001[14-689]|14(?:1[14]|34|4[17]|[56]6|7[47]|88)0011","1(?:[0-79]\\d{8}(?:\\d{2})?|8[0-24-9]\\d{7})|[148]\\d{8}|1\\d{5,7}",[6,7,8,9,10,12],0,"0",0,"0|([59]\\d{7})$","8$1",0,0,[["8(?:51(?:0(?:02|31|60|89)|1(?:18|76)|223)|91(?:0(?:1[0-2]|29)|1(?:[28]2|50|79)|2(?:10|64)|3(?:[06]8|22)|4[29]8|62\\d|70[23]|959))\\d{3}",[9]],["4(?:83[0-38]|93[0-6])\\d{5}|4(?:[0-3]\\d|4[047-9]|5[0-25-9]|6[06-9]|7[02-9]|8[0-24-9]|9[0-27-9])\\d{6}",[9]],["180(?:0\\d{3}|2)\\d{3}",[7,10]],["190[0-26]\\d{6}",[10]],0,0,0,0,["14(?:5(?:1[0458]|[23][458])|71\\d)\\d{4}",[9]],["13(?:00\\d{6}(?:\\d{2})?|45[0-4]\\d{3})|13\\d{4}",[6,8,10,12]]],"0011"],"CD":["243","00","[189]\\d{8}|[1-68]\\d{6}",[7,9],[["(\\d{2})(\\d{2})(\\d{3})","$1 $2 $3",["88"],"0$1"],["(\\d{2})(\\d{5})","$1 $2",["[1-6]"],"0$1"],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["1"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[89]"],"0$1"]],"0"],"CF":["236","00","(?:[27]\\d{3}|8776)\\d{4}",[8],[["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[278]"]]]],"CG":["242","00","222\\d{6}|(?:0\\d|80)\\d{7}",[9],[["(\\d)(\\d{4})(\\d{4})","$1 $2 $3",["8"]],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["[02]"]]]],"CH":["41","00","8\\d{11}|[2-9]\\d{8}",[9],[["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["8[047]|90"],"0$1"],["(\\d{2})(\\d{3})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[2-79]|81"],"0$1"],["(\\d{3})(\\d{2})(\\d{3})(\\d{2})(\\d{2})","$1 $2 $3 $4 $5",["8"],"0$1"]],"0"],"CI":["225","00","[02]\\d{9}",[10],[["(\\d{2})(\\d{2})(\\d)(\\d{5})","$1 $2 $3 $4",["2"]],["(\\d{2})(\\d{2})(\\d{2})(\\d{4})","$1 $2 $3 $4",["0"]]]],"CK":["682","00","[2-578]\\d{4}",[5],[["(\\d{2})(\\d{3})","$1 $2",["[2-578]"]]]],"CL":["56","(?:0|1(?:1[0-69]|2[02-5]|5[13-58]|69|7[0167]|8[018]))0","12300\\d{6}|6\\d{9,10}|[2-9]\\d{8}",[9,10,11],[["(\\d{5})(\\d{4})","$1 $2",["219","2196"],"($1)"],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["44"]],["(\\d)(\\d{4})(\\d{4})","$1 $2 $3",["2[1-36]"],"($1)"],["(\\d)(\\d{4})(\\d{4})","$1 $2 $3",["9[2-9]"]],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["3[2-5]|[47]|5[1-3578]|6[13-57]|8(?:0[1-9]|[1-9])"],"($1)"],["(\\d{3})(\\d{3})(\\d{3,4})","$1 $2 $3",["60|8"]],["(\\d{4})(\\d{3})(\\d{4})","$1 $2 $3",["1"]],["(\\d{3})(\\d{3})(\\d{2})(\\d{3})","$1 $2 $3 $4",["60"]]]],"CM":["237","00","[26]\\d{8}|88\\d{6,7}",[8,9],[["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["88"]],["(\\d)(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4 $5",["[26]|88"]]]],"CN":["86","00|1(?:[12]\\d|79)\\d\\d00","1[127]\\d{8,9}|2\\d{9}(?:\\d{2})?|[12]\\d{6,7}|86\\d{6}|(?:1[03-689]\\d|6)\\d{7,9}|(?:[3-579]\\d|8[0-57-9])\\d{6,9}",[7,8,9,10,11,12],[["(\\d{2})(\\d{5,6})","$1 $2",["(?:10|2[0-57-9])[19]","(?:10|2[0-57-9])(?:10|9[56])","(?:10|2[0-57-9])(?:100|9[56])"],"0$1"],["(\\d{3})(\\d{5,6})","$1 $2",["3(?:[157]|35|49|9[1-68])|4(?:[17]|2[179]|6[47-9]|8[23])|5(?:[1357]|2[37]|4[36]|6[1-46]|80)|6(?:3[1-5]|6[0238]|9[12])|7(?:01|[1579]|2[248]|3[014-9]|4[3-6]|6[023689])|8(?:1[236-8]|2[5-7]|[37]|8[36-8]|9[1-8])|9(?:0[1-3689]|1[1-79]|[379]|4[13]|5[1-5])|(?:4[35]|59|85)[1-9]","(?:3(?:[157]\\d|35|49|9[1-68])|4(?:[17]\\d|2[179]|[35][1-9]|6[47-9]|8[23])|5(?:[1357]\\d|2[37]|4[36]|6[1-46]|80|9[1-9])|6(?:3[1-5]|6[0238]|9[12])|7(?:01|[1579]\\d|2[248]|3[014-9]|4[3-6]|6[023689])|8(?:1[236-8]|2[5-7]|[37]\\d|5[1-9]|8[36-8]|9[1-8])|9(?:0[1-3689]|1[1-79]|[379]\\d|4[13]|5[1-5]))[19]","85[23](?:10|95)|(?:3(?:[157]\\d|35|49|9[1-68])|4(?:[17]\\d|2[179]|[35][1-9]|6[47-9]|8[23])|5(?:[1357]\\d|2[37]|4[36]|6[1-46]|80|9[1-9])|6(?:3[1-5]|6[0238]|9[12])|7(?:01|[1579]\\d|2[248]|3[014-9]|4[3-6]|6[023689])|8(?:1[236-8]|2[5-7]|[37]\\d|5[14-9]|8[36-8]|9[1-8])|9(?:0[1-3689]|1[1-79]|[379]\\d|4[13]|5[1-5]))(?:10|9[56])","85[23](?:100|95)|(?:3(?:[157]\\d|35|49|9[1-68])|4(?:[17]\\d|2[179]|[35][1-9]|6[47-9]|8[23])|5(?:[1357]\\d|2[37]|4[36]|6[1-46]|80|9[1-9])|6(?:3[1-5]|6[0238]|9[12])|7(?:01|[1579]\\d|2[248]|3[014-9]|4[3-6]|6[023689])|8(?:1[236-8]|2[5-7]|[37]\\d|5[14-9]|8[36-8]|9[1-8])|9(?:0[1-3689]|1[1-79]|[379]\\d|4[13]|5[1-5]))(?:100|9[56])"],"0$1"],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["(?:4|80)0"]],["(\\d{2})(\\d{4})(\\d{4})","$1 $2 $3",["10|2(?:[02-57-9]|1[1-9])","10|2(?:[02-57-9]|1[1-9])","10[0-79]|2(?:[02-57-9]|1[1-79])|(?:10|21)8(?:0[1-9]|[1-9])"],"0$1",1],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["3(?:[3-59]|7[02-68])|4(?:[26-8]|3[3-9]|5[2-9])|5(?:3[03-9]|[468]|7[028]|9[2-46-9])|6|7(?:[0-247]|3[04-9]|5[0-4689]|6[2368])|8(?:[1-358]|9[1-7])|9(?:[013479]|5[1-5])|(?:[34]1|55|79|87)[02-9]"],"0$1",1],["(\\d{3})(\\d{7,8})","$1 $2",["9"]],["(\\d{4})(\\d{3})(\\d{4})","$1 $2 $3",["80"],"0$1",1],["(\\d{3})(\\d{4})(\\d{4})","$1 $2 $3",["[3-578]"],"0$1",1],["(\\d{3})(\\d{4})(\\d{4})","$1 $2 $3",["1[3-9]"]],["(\\d{2})(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3 $4",["[12]"],"0$1",1]],"0",0,"0|(1(?:[12]\\d|79)\\d\\d)",0,0,0,0,"00"],"CO":["57","00(?:4(?:[14]4|56)|[579])","(?:(?:1\\d|[36])\\d{3}|9101)\\d{6}|[124-8]\\d{7}",[8,10,11],[["(\\d)(\\d{7})","$1 $2",["[146][2-9]|[2578]"],"($1)"],["(\\d{3})(\\d{7})","$1 $2",["6"],"($1)"],["(\\d{3})(\\d{7})","$1 $2",["[39]"]],["(\\d)(\\d{3})(\\d{7})","$1-$2-$3",["1"],"0$1",0,"$1 $2 $3"]],"0",0,"0([3579]|4(?:[14]4|56))?"],"CR":["506","00","(?:8\\d|90)\\d{8}|(?:[24-8]\\d{3}|3005)\\d{4}",[8,10],[["(\\d{4})(\\d{4})","$1 $2",["[2-7]|8[3-9]"]],["(\\d{3})(\\d{3})(\\d{4})","$1-$2-$3",["[89]"]]],0,0,"(19(?:0[0-2468]|1[09]|20|66|77|99))"],"CU":["53","119","[27]\\d{6,7}|[34]\\d{5,7}|(?:5|8\\d\\d)\\d{7}",[6,7,8,10],[["(\\d{2})(\\d{4,6})","$1 $2",["2[1-4]|[34]"],"(0$1)"],["(\\d)(\\d{6,7})","$1 $2",["7"],"(0$1)"],["(\\d)(\\d{7})","$1 $2",["5"],"0$1"],["(\\d{3})(\\d{7})","$1 $2",["8"],"0$1"]],"0"],"CV":["238","0","(?:[2-59]\\d\\d|800)\\d{4}",[7],[["(\\d{3})(\\d{2})(\\d{2})","$1 $2 $3",["[2-589]"]]]],"CW":["599","00","(?:[34]1|60|(?:7|9\\d)\\d)\\d{5}",[7,8],[["(\\d{3})(\\d{4})","$1 $2",["[3467]"]],["(\\d)(\\d{3})(\\d{4})","$1 $2 $3",["9[4-8]"]]],0,0,0,0,0,"[69]"],"CX":["61","001[14-689]|14(?:1[14]|34|4[17]|[56]6|7[47]|88)0011","1(?:[0-79]\\d{8}(?:\\d{2})?|8[0-24-9]\\d{7})|[148]\\d{8}|1\\d{5,7}",[6,7,8,9,10,12],0,"0",0,"0|([59]\\d{7})$","8$1",0,0,[["8(?:51(?:0(?:01|30|59|88)|1(?:17|46|75)|2(?:22|35))|91(?:00[6-9]|1(?:[28]1|49|78)|2(?:09|63)|3(?:12|26|75)|4(?:56|97)|64\\d|7(?:0[01]|1[0-2])|958))\\d{3}",[9]],["4(?:83[0-38]|93[0-6])\\d{5}|4(?:[0-3]\\d|4[047-9]|5[0-25-9]|6[06-9]|7[02-9]|8[0-24-9]|9[0-27-9])\\d{6}",[9]],["180(?:0\\d{3}|2)\\d{3}",[7,10]],["190[0-26]\\d{6}",[10]],0,0,0,0,["14(?:5(?:1[0458]|[23][458])|71\\d)\\d{4}",[9]],["13(?:00\\d{6}(?:\\d{2})?|45[0-4]\\d{3})|13\\d{4}",[6,8,10,12]]],"0011"],"CY":["357","00","(?:[279]\\d|[58]0)\\d{6}",[8],[["(\\d{2})(\\d{6})","$1 $2",["[257-9]"]]]],"CZ":["420","00","(?:[2-578]\\d|60)\\d{7}|9\\d{8,11}",[9],[["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[2-8]|9[015-7]"]],["(\\d{2})(\\d{3})(\\d{3})(\\d{2})","$1 $2 $3 $4",["96"]],["(\\d{2})(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3 $4",["9"]],["(\\d{3})(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3 $4",["9"]]]],"DE":["49","00","[2579]\\d{5,14}|49(?:[34]0|69|8\\d)\\d\\d?|49(?:37|49|60|7[089]|9\\d)\\d{1,3}|49(?:1\\d|2[02-9]|3[2-689]|7[1-7])\\d{1,8}|(?:1|[368]\\d|4[0-8])\\d{3,13}|49(?:[05]\\d|[23]1|[46][1-8])\\d{1,9}",[4,5,6,7,8,9,10,11,12,13,14,15],[["(\\d{2})(\\d{3,13})","$1 $2",["3[02]|40|[68]9"],"0$1"],["(\\d{3})(\\d{3,12})","$1 $2",["2(?:0[1-389]|1[124]|2[18]|3[14])|3(?:[35-9][15]|4[015])|906|(?:2[4-9]|4[2-9]|[579][1-9]|[68][1-8])1","2(?:0[1-389]|12[0-8])|3(?:[35-9][15]|4[015])|906|2(?:[13][14]|2[18])|(?:2[4-9]|4[2-9]|[579][1-9]|[68][1-8])1"],"0$1"],["(\\d{4})(\\d{2,11})","$1 $2",["[24-6]|3(?:[3569][02-46-9]|4[2-4679]|7[2-467]|8[2-46-8])|70[2-8]|8(?:0[2-9]|[1-8])|90[7-9]|[79][1-9]","[24-6]|3(?:3(?:0[1-467]|2[127-9]|3[124578]|7[1257-9]|8[1256]|9[145])|4(?:2[135]|4[13578]|9[1346])|5(?:0[14]|2[1-3589]|6[1-4]|7[13468]|8[13568])|6(?:2[1-489]|3[124-6]|6[13]|7[12579]|8[1-356]|9[135])|7(?:2[1-7]|4[145]|6[1-5]|7[1-4])|8(?:21|3[1468]|6|7[1467]|8[136])|9(?:0[12479]|2[1358]|4[134679]|6[1-9]|7[136]|8[147]|9[1468]))|70[2-8]|8(?:0[2-9]|[1-8])|90[7-9]|[79][1-9]|3[68]4[1347]|3(?:47|60)[1356]|3(?:3[46]|46|5[49])[1246]|3[4579]3[1357]"],"0$1"],["(\\d{3})(\\d{4})","$1 $2",["138"],"0$1"],["(\\d{5})(\\d{2,10})","$1 $2",["3"],"0$1"],["(\\d{3})(\\d{5,11})","$1 $2",["181"],"0$1"],["(\\d{3})(\\d)(\\d{4,10})","$1 $2 $3",["1(?:3|80)|9"],"0$1"],["(\\d{3})(\\d{7,8})","$1 $2",["1[67]"],"0$1"],["(\\d{3})(\\d{7,12})","$1 $2",["8"],"0$1"],["(\\d{5})(\\d{6})","$1 $2",["185","1850","18500"],"0$1"],["(\\d{3})(\\d{4})(\\d{4})","$1 $2 $3",["7"],"0$1"],["(\\d{4})(\\d{7})","$1 $2",["18[68]"],"0$1"],["(\\d{5})(\\d{6})","$1 $2",["15[0568]"],"0$1"],["(\\d{4})(\\d{7})","$1 $2",["15[1279]"],"0$1"],["(\\d{3})(\\d{8})","$1 $2",["18"],"0$1"],["(\\d{3})(\\d{2})(\\d{7,8})","$1 $2 $3",["1(?:6[023]|7)"],"0$1"],["(\\d{4})(\\d{2})(\\d{7})","$1 $2 $3",["15[279]"],"0$1"],["(\\d{3})(\\d{2})(\\d{8})","$1 $2 $3",["15"],"0$1"]],"0"],"DJ":["253","00","(?:2\\d|77)\\d{6}",[8],[["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[27]"]]]],"DK":["45","00","[2-9]\\d{7}",[8],[["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[2-9]"]]]],"DM":["1","011","(?:[58]\\d\\d|767|900)\\d{7}",[10],0,"1",0,"1|([2-7]\\d{6})$","767$1",0,"767"],"DO":["1","011","(?:[58]\\d\\d|900)\\d{7}",[10],0,"1",0,0,0,0,"8001|8[024]9"],"DZ":["213","00","(?:[1-4]|[5-79]\\d|80)\\d{7}",[8,9],[["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[1-4]"],"0$1"],["(\\d{2})(\\d{3})(\\d{2})(\\d{2})","$1 $2 $3 $4",["9"],"0$1"],["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[5-8]"],"0$1"]],"0"],"EC":["593","00","1\\d{9,10}|(?:[2-7]|9\\d)\\d{7}",[8,9,10,11],[["(\\d)(\\d{3})(\\d{4})","$1 $2-$3",["[2-7]"],"(0$1)",0,"$1-$2-$3"],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["9"],"0$1"],["(\\d{4})(\\d{3})(\\d{3,4})","$1 $2 $3",["1"]]],"0"],"EE":["372","00","8\\d{9}|[4578]\\d{7}|(?:[3-8]\\d|90)\\d{5}",[7,8,10],[["(\\d{3})(\\d{4})","$1 $2",["[369]|4[3-8]|5(?:[0-2]|5[0-478]|6[45])|7[1-9]|88","[369]|4[3-8]|5(?:[02]|1(?:[0-8]|95)|5[0-478]|6(?:4[0-4]|5[1-589]))|7[1-9]|88"]],["(\\d{4})(\\d{3,4})","$1 $2",["[45]|8(?:00|[1-49])","[45]|8(?:00[1-9]|[1-49])"]],["(\\d{2})(\\d{2})(\\d{4})","$1 $2 $3",["7"]],["(\\d{4})(\\d{3})(\\d{3})","$1 $2 $3",["8"]]]],"EG":["20","00","[189]\\d{8,9}|[24-6]\\d{8}|[135]\\d{7}",[8,9,10],[["(\\d)(\\d{7,8})","$1 $2",["[23]"],"0$1"],["(\\d{2})(\\d{6,7})","$1 $2",["1[35]|[4-6]|8[2468]|9[235-7]"],"0$1"],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["[189]"],"0$1"]],"0"],"EH":["212","00","[5-8]\\d{8}",[9],0,"0",0,0,0,0,"528[89]"],"ER":["291","00","[178]\\d{6}",[7],[["(\\d)(\\d{3})(\\d{3})","$1 $2 $3",["[178]"],"0$1"]],"0"],"ES":["34","00","[5-9]\\d{8}",[9],[["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[89]00"]],["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[5-9]"]]]],"ET":["251","00","(?:11|[2-59]\\d)\\d{7}",[9],[["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["[1-59]"],"0$1"]],"0"],"FI":["358","00|99(?:[01469]|5(?:[14]1|3[23]|5[59]|77|88|9[09]))","[1-35689]\\d{4}|7\\d{10,11}|(?:[124-7]\\d|3[0-46-9])\\d{8}|[1-9]\\d{5,8}",[5,6,7,8,9,10,11,12],[["(\\d)(\\d{4,9})","$1 $2",["[2568][1-8]|3(?:0[1-9]|[1-9])|9"],"0$1"],["(\\d{3})(\\d{3,7})","$1 $2",["[12]00|[368]|70[07-9]"],"0$1"],["(\\d{2})(\\d{4,8})","$1 $2",["[1245]|7[135]"],"0$1"],["(\\d{2})(\\d{6,10})","$1 $2",["7"],"0$1"]],"0",0,0,0,0,"1[03-79]|[2-9]",0,"00"],"FJ":["679","0(?:0|52)","45\\d{5}|(?:0800\\d|[235-9])\\d{6}",[7,11],[["(\\d{3})(\\d{4})","$1 $2",["[235-9]|45"]],["(\\d{4})(\\d{3})(\\d{4})","$1 $2 $3",["0"]]],0,0,0,0,0,0,0,"00"],"FK":["500","00","[2-7]\\d{4}",[5]],"FM":["691","00","(?:[39]\\d\\d|820)\\d{4}",[7],[["(\\d{3})(\\d{4})","$1 $2",["[389]"]]]],"FO":["298","00","[2-9]\\d{5}",[6],[["(\\d{6})","$1",["[2-9]"]]],0,0,"(10(?:01|[12]0|88))"],"FR":["33","00","[1-9]\\d{8}",[9],[["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["8"],"0 $1"],["(\\d)(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4 $5",["[1-79]"],"0$1"]],"0"],"GA":["241","00","(?:[067]\\d|11)\\d{6}|[2-7]\\d{6}",[7,8],[["(\\d)(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[2-7]"],"0$1"],["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["0"]],["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["11|[67]"],"0$1"]],0,0,"0(11\\d{6}|60\\d{6}|61\\d{6}|6[256]\\d{6}|7[467]\\d{6})","$1"],"GB":["44","00","[1-357-9]\\d{9}|[18]\\d{8}|8\\d{6}",[7,9,10],[["(\\d{3})(\\d{4})","$1 $2",["800","8001","80011","800111","8001111"],"0$1"],["(\\d{3})(\\d{2})(\\d{2})","$1 $2 $3",["845","8454","84546","845464"],"0$1"],["(\\d{3})(\\d{6})","$1 $2",["800"],"0$1"],["(\\d{5})(\\d{4,5})","$1 $2",["1(?:38|5[23]|69|76|94)","1(?:(?:38|69)7|5(?:24|39)|768|946)","1(?:3873|5(?:242|39[4-6])|(?:697|768)[347]|9467)"],"0$1"],["(\\d{4})(\\d{5,6})","$1 $2",["1(?:[2-69][02-9]|[78])"],"0$1"],["(\\d{2})(\\d{4})(\\d{4})","$1 $2 $3",["[25]|7(?:0|6[02-9])","[25]|7(?:0|6(?:[03-9]|2[356]))"],"0$1"],["(\\d{4})(\\d{6})","$1 $2",["7"],"0$1"],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["[1389]"],"0$1"]],"0",0,0,0,0,0,[["(?:1(?:1(?:3(?:[0-58]\\d\\d|73[0235])|4(?:[0-5]\\d\\d|69[7-9]|70[01359])|(?:5[0-26-9]|[78][0-49])\\d\\d|6(?:[0-4]\\d\\d|50[0-79]))|2(?:(?:0[024-9]|2[3-9]|3[3-79]|4[1-689]|[58][02-9]|6[0-47-9]|7[013-9]|9\\d)\\d\\d|1(?:[0-7]\\d\\d|8(?:[02]\\d|1[0-26-9])))|(?:3(?:0\\d|1[0-8]|[25][02-9]|3[02-579]|[468][0-46-9]|7[1-35-79]|9[2-578])|4(?:0[03-9]|[137]\\d|[28][02-57-9]|4[02-69]|5[0-8]|[69][0-79])|5(?:0[1-35-9]|[16]\\d|2[024-9]|3[015689]|4[02-9]|5[03-9]|7[0-35-9]|8[0-468]|9[0-57-9])|6(?:0[034689]|1\\d|2[0-35689]|[38][013-9]|4[1-467]|5[0-69]|6[13-9]|7[0-8]|9[0-24578])|7(?:0[0246-9]|2\\d|3[0236-8]|4[03-9]|5[0-46-9]|6[013-9]|7[0-35-9]|8[024-9]|9[02-9])|8(?:0[35-9]|2[1-57-9]|3[02-578]|4[0-578]|5[124-9]|6[2-69]|7\\d|8[02-9]|9[02569])|9(?:0[02-589]|[18]\\d|2[02-689]|3[1-57-9]|4[2-9]|5[0-579]|6[2-47-9]|7[0-24578]|9[2-57]))\\d\\d)|2(?:0[013478]|3[0189]|4[017]|8[0-46-9]|9[0-2])\\d{3})\\d{4}|1(?:2(?:0(?:46[1-4]|87[2-9])|545[1-79]|76(?:2\\d|3[1-8]|6[1-6])|9(?:7(?:2[0-4]|3[2-5])|8(?:2[2-8]|7[0-47-9]|8[3-5])))|3(?:6(?:38[2-5]|47[23])|8(?:47[04-9]|64[0157-9]))|4(?:044[1-7]|20(?:2[23]|8\\d)|6(?:0(?:30|5[2-57]|6[1-8]|7[2-8])|140)|8(?:052|87[1-3]))|5(?:2(?:4(?:3[2-79]|6\\d)|76\\d)|6(?:26[06-9]|686))|6(?:06(?:4\\d|7[4-79])|295[5-7]|35[34]\\d|47(?:24|61)|59(?:5[08]|6[67]|74)|9(?:55[0-4]|77[23]))|7(?:26(?:6[13-9]|7[0-7])|(?:442|688)\\d|50(?:2[0-3]|[3-68]2|76))|8(?:27[56]\\d|37(?:5[2-5]|8[239])|843[2-58])|9(?:0(?:0(?:6[1-8]|85)|52\\d)|3583|4(?:66[1-8]|9(?:2[01]|81))|63(?:23|3[1-4])|9561))\\d{3}",[9,10]],["7(?:457[0-57-9]|700[01]|911[028])\\d{5}|7(?:[1-3]\\d\\d|4(?:[0-46-9]\\d|5[0-689])|5(?:0[0-8]|[13-9]\\d|2[0-35-9])|7(?:0[1-9]|[1-7]\\d|8[02-9]|9[0-689])|8(?:[014-9]\\d|[23][0-8])|9(?:[024-9]\\d|1[02-9]|3[0-689]))\\d{6}",[10]],["80[08]\\d{7}|800\\d{6}|8001111"],["(?:8(?:4[2-5]|7[0-3])|9(?:[01]\\d|8[2-49]))\\d{7}|845464\\d",[7,10]],["70\\d{8}",[10]],0,["(?:3[0347]|55)\\d{8}",[10]],["76(?:464|652)\\d{5}|76(?:0[0-2]|2[356]|34|4[01347]|5[49]|6[0-369]|77|8[14]|9[139])\\d{6}",[10]],["56\\d{8}",[10]]],0," x"],"GD":["1","011","(?:473|[58]\\d\\d|900)\\d{7}",[10],0,"1",0,"1|([2-9]\\d{6})$","473$1",0,"473"],"GE":["995","00","(?:[3-57]\\d\\d|800)\\d{6}",[9],[["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["70"],"0$1"],["(\\d{2})(\\d{3})(\\d{2})(\\d{2})","$1 $2 $3 $4",["32"],"0$1"],["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[57]"]],["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[348]"],"0$1"]],"0"],"GF":["594","00","(?:[56]94|80\\d|976)\\d{6}",[9],[["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[569]"],"0$1"],["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["8"],"0$1"]],"0"],"GG":["44","00","(?:1481|[357-9]\\d{3})\\d{6}|8\\d{6}(?:\\d{2})?",[7,9,10],0,"0",0,"0|([25-9]\\d{5})$","1481$1",0,0,[["1481[25-9]\\d{5}",[10]],["7(?:(?:781|839)\\d|911[17])\\d{5}",[10]],["80[08]\\d{7}|800\\d{6}|8001111"],["(?:8(?:4[2-5]|7[0-3])|9(?:[01]\\d|8[0-3]))\\d{7}|845464\\d",[7,10]],["70\\d{8}",[10]],0,["(?:3[0347]|55)\\d{8}",[10]],["76(?:464|652)\\d{5}|76(?:0[0-2]|2[356]|34|4[01347]|5[49]|6[0-369]|77|8[14]|9[139])\\d{6}",[10]],["56\\d{8}",[10]]]],"GH":["233","00","(?:[235]\\d{3}|800)\\d{5}",[8,9],[["(\\d{3})(\\d{5})","$1 $2",["8"],"0$1"],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["[235]"],"0$1"]],"0"],"GI":["350","00","(?:[25]\\d\\d|606)\\d{5}",[8],[["(\\d{3})(\\d{5})","$1 $2",["2"]]]],"GL":["299","00","(?:19|[2-689]\\d|70)\\d{4}",[6],[["(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3",["19|[2-9]"]]]],"GM":["220","00","[2-9]\\d{6}",[7],[["(\\d{3})(\\d{4})","$1 $2",["[2-9]"]]]],"GN":["224","00","722\\d{6}|(?:3|6\\d)\\d{7}",[8,9],[["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["3"]],["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[67]"]]]],"GP":["590","00","(?:590|(?:69|80)\\d|976)\\d{6}",[9],[["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[569]"],"0$1"],["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["8"],"0$1"]],"0",0,0,0,0,0,[["590(?:0[1-68]|[14][0-24-9]|2[0-68]|3[1289]|5[3-579]|6[0189]|7[08]|8[0-689]|9\\d)\\d{4}"],["69(?:0\\d\\d|1(?:2[2-9]|3[0-5]))\\d{4}"],["80[0-5]\\d{6}"],0,0,0,0,0,["976[01]\\d{5}"]]],"GQ":["240","00","222\\d{6}|(?:3\\d|55|[89]0)\\d{7}",[9],[["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[235]"]],["(\\d{3})(\\d{6})","$1 $2",["[89]"]]]],"GR":["30","00","5005000\\d{3}|8\\d{9,11}|(?:[269]\\d|70)\\d{8}",[10,11,12],[["(\\d{2})(\\d{4})(\\d{4})","$1 $2 $3",["21|7"]],["(\\d{4})(\\d{6})","$1 $2",["2(?:2|3[2-57-9]|4[2-469]|5[2-59]|6[2-9]|7[2-69]|8[2-49])|5"]],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["[2689]"]],["(\\d{3})(\\d{3,4})(\\d{5})","$1 $2 $3",["8"]]]],"GT":["502","00","(?:1\\d{3}|[2-7])\\d{7}",[8,11],[["(\\d{4})(\\d{4})","$1 $2",["[2-7]"]],["(\\d{4})(\\d{3})(\\d{4})","$1 $2 $3",["1"]]]],"GU":["1","011","(?:[58]\\d\\d|671|900)\\d{7}",[10],0,"1",0,"1|([3-9]\\d{6})$","671$1",0,"671"],"GW":["245","00","[49]\\d{8}|4\\d{6}",[7,9],[["(\\d{3})(\\d{4})","$1 $2",["40"]],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[49]"]]]],"GY":["592","001","9008\\d{3}|(?:[2-467]\\d\\d|862)\\d{4}",[7],[["(\\d{3})(\\d{4})","$1 $2",["[2-46-9]"]]]],"HK":["852","00(?:30|5[09]|[126-9]?)","8[0-46-9]\\d{6,7}|9\\d{4,7}|(?:[2-7]|9\\d{3})\\d{7}",[5,6,7,8,9,11],[["(\\d{3})(\\d{2,5})","$1 $2",["900","9003"]],["(\\d{4})(\\d{4})","$1 $2",["[2-7]|8[1-4]|9(?:0[1-9]|[1-8])"]],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["8"]],["(\\d{3})(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3 $4",["9"]]],0,0,0,0,0,0,0,"00"],"HN":["504","00","8\\d{10}|[237-9]\\d{7}",[8,11],[["(\\d{4})(\\d{4})","$1-$2",["[237-9]"]]]],"HR":["385","00","(?:[24-69]\\d|3[0-79])\\d{7}|80\\d{5,7}|[1-79]\\d{7}|6\\d{5,6}",[6,7,8,9],[["(\\d{2})(\\d{2})(\\d{2,3})","$1 $2 $3",["6[01]"],"0$1"],["(\\d{3})(\\d{2})(\\d{2,3})","$1 $2 $3",["8"],"0$1"],["(\\d)(\\d{4})(\\d{3})","$1 $2 $3",["1"],"0$1"],["(\\d{2})(\\d{3})(\\d{3,4})","$1 $2 $3",["[67]"],"0$1"],["(\\d{2})(\\d{3})(\\d{3,4})","$1 $2 $3",["9"],"0$1"],["(\\d{2})(\\d{3})(\\d{3,4})","$1 $2 $3",["[2-5]"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["8"],"0$1"]],"0"],"HT":["509","00","[2-489]\\d{7}",[8],[["(\\d{2})(\\d{2})(\\d{4})","$1 $2 $3",["[2-489]"]]]],"HU":["36","00","[235-7]\\d{8}|[1-9]\\d{7}",[8,9],[["(\\d)(\\d{3})(\\d{4})","$1 $2 $3",["1"],"(06 $1)"],["(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3",["[27][2-9]|3[2-7]|4[24-9]|5[2-79]|6|8[2-57-9]|9[2-69]"],"(06 $1)"],["(\\d{2})(\\d{3})(\\d{3,4})","$1 $2 $3",["[2-9]"],"06 $1"]],"06"],"ID":["62","00[89]","(?:(?:00[1-9]|8\\d)\\d{4}|[1-36])\\d{6}|00\\d{10}|[1-9]\\d{8,10}|[2-9]\\d{7}",[7,8,9,10,11,12,13],[["(\\d)(\\d{3})(\\d{3})","$1 $2 $3",["15"]],["(\\d{2})(\\d{5,9})","$1 $2",["2[124]|[36]1"],"(0$1)"],["(\\d{3})(\\d{5,7})","$1 $2",["800"],"0$1"],["(\\d{3})(\\d{5,8})","$1 $2",["[2-79]"],"(0$1)"],["(\\d{3})(\\d{3,4})(\\d{3})","$1-$2-$3",["8[1-35-9]"],"0$1"],["(\\d{3})(\\d{6,8})","$1 $2",["1"],"0$1"],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["804"],"0$1"],["(\\d{3})(\\d)(\\d{3})(\\d{3})","$1 $2 $3 $4",["80"],"0$1"],["(\\d{3})(\\d{4})(\\d{4,5})","$1-$2-$3",["8"],"0$1"]],"0"],"IE":["353","00","(?:1\\d|[2569])\\d{6,8}|4\\d{6,9}|7\\d{8}|8\\d{8,9}",[7,8,9,10],[["(\\d{2})(\\d{5})","$1 $2",["2[24-9]|47|58|6[237-9]|9[35-9]"],"(0$1)"],["(\\d{3})(\\d{5})","$1 $2",["[45]0"],"(0$1)"],["(\\d)(\\d{3,4})(\\d{4})","$1 $2 $3",["1"],"(0$1)"],["(\\d{2})(\\d{3})(\\d{3,4})","$1 $2 $3",["[2569]|4[1-69]|7[14]"],"(0$1)"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["70"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["81"],"(0$1)"],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["[78]"],"0$1"],["(\\d{4})(\\d{3})(\\d{3})","$1 $2 $3",["1"]],["(\\d{2})(\\d{4})(\\d{4})","$1 $2 $3",["4"],"(0$1)"],["(\\d{2})(\\d)(\\d{3})(\\d{4})","$1 $2 $3 $4",["8"],"0$1"]],"0"],"IL":["972","0(?:0|1[2-9])","1\\d{6}(?:\\d{3,5})?|[57]\\d{8}|[1-489]\\d{7}",[7,8,9,10,11,12],[["(\\d{4})(\\d{3})","$1-$2",["125"]],["(\\d{4})(\\d{2})(\\d{2})","$1-$2-$3",["121"]],["(\\d)(\\d{3})(\\d{4})","$1-$2-$3",["[2-489]"],"0$1"],["(\\d{2})(\\d{3})(\\d{4})","$1-$2-$3",["[57]"],"0$1"],["(\\d{4})(\\d{3})(\\d{3})","$1-$2-$3",["12"]],["(\\d{4})(\\d{6})","$1-$2",["159"]],["(\\d)(\\d{3})(\\d{3})(\\d{3})","$1-$2-$3-$4",["1[7-9]"]],["(\\d{3})(\\d{1,2})(\\d{3})(\\d{4})","$1-$2 $3-$4",["15"]]],"0"],"IM":["44","00","1624\\d{6}|(?:[3578]\\d|90)\\d{8}",[10],0,"0",0,"0|([25-8]\\d{5})$","1624$1",0,"74576|(?:16|7[56])24"],"IN":["91","00","(?:000800|[2-9]\\d\\d)\\d{7}|1\\d{7,12}",[8,9,10,11,12,13],[["(\\d{8})","$1",["5(?:0|2[23]|3[03]|[67]1|88)","5(?:0|2(?:21|3)|3(?:0|3[23])|616|717|888)","5(?:0|2(?:21|3)|3(?:0|3[23])|616|717|8888)"],0,1],["(\\d{4})(\\d{4,5})","$1 $2",["180","1800"],0,1],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["140"],0,1],["(\\d{2})(\\d{4})(\\d{4})","$1 $2 $3",["11|2[02]|33|4[04]|79[1-7]|80[2-46]","11|2[02]|33|4[04]|79(?:[1-6]|7[19])|80(?:[2-4]|6[0-589])","11|2[02]|33|4[04]|79(?:[124-6]|3(?:[02-9]|1[0-24-9])|7(?:1|9[1-6]))|80(?:[2-4]|6[0-589])"],"0$1",1],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["1(?:2[0-249]|3[0-25]|4[145]|[68]|7[1257])|2(?:1[257]|3[013]|4[01]|5[0137]|6[0158]|78|8[1568])|3(?:26|4[1-3]|5[34]|6[01489]|7[02-46]|8[159])|4(?:1[36]|2[1-47]|5[12]|6[0-26-9]|7[0-24-9]|8[013-57]|9[014-7])|5(?:1[025]|22|[36][25]|4[28]|5[12]|[78]1)|6(?:12|[2-4]1|5[17]|6[13]|80)|7(?:12|3[134]|4[47]|61|88)|8(?:16|2[014]|3[126]|6[136]|7[078]|8[34]|91)|(?:43|59|75)[15]|(?:1[59]|29|67|72)[14]","1(?:2[0-24]|3[0-25]|4[145]|[59][14]|6[1-9]|7[1257]|8[1-57-9])|2(?:1[257]|3[013]|4[01]|5[0137]|6[058]|78|8[1568]|9[14])|3(?:26|4[1-3]|5[34]|6[01489]|7[02-46]|8[159])|4(?:1[36]|2[1-47]|3[15]|5[12]|6[0-26-9]|7[0-24-9]|8[013-57]|9[014-7])|5(?:1[025]|22|[36][25]|4[28]|[578]1|9[15])|674|7(?:(?:2[14]|3[34]|5[15])[2-6]|61[346]|88[0-8])|8(?:70[2-6]|84[235-7]|91[3-7])|(?:1(?:29|60|8[06])|261|552|6(?:12|[2-47]1|5[17]|6[13]|80)|7(?:12|31|4[47])|8(?:16|2[014]|3[126]|6[136]|7[78]|83))[2-7]","1(?:2[0-24]|3[0-25]|4[145]|[59][14]|6[1-9]|7[1257]|8[1-57-9])|2(?:1[257]|3[013]|4[01]|5[0137]|6[058]|78|8[1568]|9[14])|3(?:26|4[1-3]|5[34]|6[01489]|7[02-46]|8[159])|4(?:1[36]|2[1-47]|3[15]|5[12]|6[0-26-9]|7[0-24-9]|8[013-57]|9[014-7])|5(?:1[025]|22|[36][25]|4[28]|[578]1|9[15])|6(?:12(?:[2-6]|7[0-8])|74[2-7])|7(?:(?:2[14]|5[15])[2-6]|3171|61[346]|88(?:[2-7]|82))|8(?:70[2-6]|84(?:[2356]|7[19])|91(?:[3-6]|7[19]))|73[134][2-6]|(?:74[47]|8(?:16|2[014]|3[126]|6[136]|7[78]|83))(?:[2-6]|7[19])|(?:1(?:29|60|8[06])|261|552|6(?:[2-4]1|5[17]|6[13]|7(?:1|4[0189])|80)|7(?:12|88[01]))[2-7]"],"0$1",1],["(\\d{4})(\\d{3})(\\d{3})","$1 $2 $3",["1(?:[2-479]|5[0235-9])|[2-5]|6(?:1[1358]|2[2457-9]|3[2-5]|4[235-7]|5[2-689]|6[24578]|7[235689]|8[1-6])|7(?:1[013-9]|28|3[129]|4[1-35689]|5[29]|6[02-5]|70)|807","1(?:[2-479]|5[0235-9])|[2-5]|6(?:1[1358]|2(?:[2457]|84|95)|3(?:[2-4]|55)|4[235-7]|5[2-689]|6[24578]|7[235689]|8[1-6])|7(?:1(?:[013-8]|9[6-9])|28[6-8]|3(?:17|2[0-49]|9[2-57])|4(?:1[2-4]|[29][0-7]|3[0-8]|[56]|8[0-24-7])|5(?:2[1-3]|9[0-6])|6(?:0[5689]|2[5-9]|3[02-8]|4|5[0-367])|70[13-7])|807[19]","1(?:[2-479]|5(?:[0236-9]|5[013-9]))|[2-5]|6(?:2(?:84|95)|355|83)|73179|807(?:1|9[1-3])|(?:1552|6(?:1[1358]|2[2457]|3[2-4]|4[235-7]|5[2-689]|6[24578]|7[235689]|8[124-6])\\d|7(?:1(?:[013-8]\\d|9[6-9])|28[6-8]|3(?:2[0-49]|9[2-57])|4(?:1[2-4]|[29][0-7]|3[0-8]|[56]\\d|8[0-24-7])|5(?:2[1-3]|9[0-6])|6(?:0[5689]|2[5-9]|3[02-8]|4\\d|5[0-367])|70[13-7]))[2-7]"],"0$1",1],["(\\d{5})(\\d{5})","$1 $2",["[6-9]"],"0$1",1],["(\\d{4})(\\d{2,4})(\\d{4})","$1 $2 $3",["1(?:6|8[06])","1(?:6|8[06]0)"],0,1],["(\\d{4})(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3 $4",["18"],0,1]],"0"],"IO":["246","00","3\\d{6}",[7],[["(\\d{3})(\\d{4})","$1 $2",["3"]]]],"IQ":["964","00","(?:1|7\\d\\d)\\d{7}|[2-6]\\d{7,8}",[8,9,10],[["(\\d)(\\d{3})(\\d{4})","$1 $2 $3",["1"],"0$1"],["(\\d{2})(\\d{3})(\\d{3,4})","$1 $2 $3",["[2-6]"],"0$1"],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["7"],"0$1"]],"0"],"IR":["98","00","[1-9]\\d{9}|(?:[1-8]\\d\\d|9)\\d{3,4}",[4,5,6,7,10],[["(\\d{4,5})","$1",["96"],"0$1"],["(\\d{2})(\\d{4,5})","$1 $2",["(?:1[137]|2[13-68]|3[1458]|4[145]|5[1468]|6[16]|7[1467]|8[13467])[12689]"],"0$1"],["(\\d{3})(\\d{3})(\\d{3,4})","$1 $2 $3",["9"],"0$1"],["(\\d{2})(\\d{4})(\\d{4})","$1 $2 $3",["[1-8]"],"0$1"]],"0"],"IS":["354","00|1(?:0(?:01|[12]0)|100)","(?:38\\d|[4-9])\\d{6}",[7,9],[["(\\d{3})(\\d{4})","$1 $2",["[4-9]"]],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["3"]]],0,0,0,0,0,0,0,"00"],"IT":["39","00","0\\d{5,10}|1\\d{8,10}|3(?:[0-8]\\d{7,10}|9\\d{7,8})|(?:55|70)\\d{8}|8\\d{5}(?:\\d{2,4})?",[6,7,8,9,10,11],[["(\\d{2})(\\d{4,6})","$1 $2",["0[26]"]],["(\\d{3})(\\d{3,6})","$1 $2",["0[13-57-9][0159]|8(?:03|4[17]|9[2-5])","0[13-57-9][0159]|8(?:03|4[17]|9(?:2|3[04]|[45][0-4]))"]],["(\\d{4})(\\d{2,6})","$1 $2",["0(?:[13-579][2-46-8]|8[236-8])"]],["(\\d{4})(\\d{4})","$1 $2",["894"]],["(\\d{2})(\\d{3,4})(\\d{4})","$1 $2 $3",["0[26]|5"]],["(\\d{3})(\\d{3})(\\d{3,4})","$1 $2 $3",["1(?:44|[679])|[378]"]],["(\\d{3})(\\d{3,4})(\\d{4})","$1 $2 $3",["0[13-57-9][0159]|14"]],["(\\d{2})(\\d{4})(\\d{5})","$1 $2 $3",["0[26]"]],["(\\d{4})(\\d{3})(\\d{4})","$1 $2 $3",["0"]],["(\\d{3})(\\d{4})(\\d{4,5})","$1 $2 $3",["3"]]],0,0,0,0,0,0,[["0669[0-79]\\d{1,6}|0(?:1(?:[0159]\\d|[27][1-5]|31|4[1-4]|6[1356]|8[2-57])|2\\d\\d|3(?:[0159]\\d|2[1-4]|3[12]|[48][1-6]|6[2-59]|7[1-7])|4(?:[0159]\\d|[23][1-9]|4[245]|6[1-5]|7[1-4]|81)|5(?:[0159]\\d|2[1-5]|3[2-6]|4[1-79]|6[4-6]|7[1-578]|8[3-8])|6(?:[0-57-9]\\d|6[0-8])|7(?:[0159]\\d|2[12]|3[1-7]|4[2-46]|6[13569]|7[13-6]|8[1-59])|8(?:[0159]\\d|2[3-578]|3[1-356]|[6-8][1-5])|9(?:[0159]\\d|[238][1-5]|4[12]|6[1-8]|7[1-6]))\\d{2,7}"],["3[1-9]\\d{8}|3[2-9]\\d{7}",[9,10]],["80(?:0\\d{3}|3)\\d{3}",[6,9]],["(?:0878\\d{3}|89(?:2\\d|3[04]|4(?:[0-4]|[5-9]\\d\\d)|5[0-4]))\\d\\d|(?:1(?:44|6[346])|89(?:38|5[5-9]|9))\\d{6}",[6,8,9,10]],["1(?:78\\d|99)\\d{6}",[9,10]],0,0,0,["55\\d{8}",[10]],["84(?:[08]\\d{3}|[17])\\d{3}",[6,9]]]],"JE":["44","00","1534\\d{6}|(?:[3578]\\d|90)\\d{8}",[10],0,"0",0,"0|([0-24-8]\\d{5})$","1534$1",0,0,[["1534[0-24-8]\\d{5}"],["7(?:(?:(?:50|82)9|937)\\d|7(?:00[378]|97[7-9]))\\d{5}"],["80(?:07(?:35|81)|8901)\\d{4}"],["(?:8(?:4(?:4(?:4(?:05|42|69)|703)|5(?:041|800))|7(?:0002|1206))|90(?:066[59]|1810|71(?:07|55)))\\d{4}"],["701511\\d{4}"],0,["(?:3(?:0(?:07(?:35|81)|8901)|3\\d{4}|4(?:4(?:4(?:05|42|69)|703)|5(?:041|800))|7(?:0002|1206))|55\\d{4})\\d{4}"],["76(?:464|652)\\d{5}|76(?:0[0-2]|2[356]|34|4[01347]|5[49]|6[0-369]|77|8[14]|9[139])\\d{6}"],["56\\d{8}"]]],"JM":["1","011","(?:[58]\\d\\d|658|900)\\d{7}",[10],0,"1",0,0,0,0,"658|876"],"JO":["962","00","(?:(?:[2689]|7\\d)\\d|32|53)\\d{6}",[8,9],[["(\\d)(\\d{3})(\\d{4})","$1 $2 $3",["[2356]|87"],"(0$1)"],["(\\d{3})(\\d{5,6})","$1 $2",["[89]"],"0$1"],["(\\d{2})(\\d{7})","$1 $2",["70"],"0$1"],["(\\d)(\\d{4})(\\d{4})","$1 $2 $3",["7"],"0$1"]],"0"],"JP":["81","010","00[1-9]\\d{6,14}|[257-9]\\d{9}|(?:00|[1-9]\\d\\d)\\d{6}",[8,9,10,11,12,13,14,15,16,17],[["(\\d{3})(\\d{3})(\\d{3})","$1-$2-$3",["(?:12|57|99)0"],"0$1"],["(\\d{4})(\\d)(\\d{4})","$1-$2-$3",["1(?:26|3[79]|4[56]|5[4-68]|6[3-5])|499|5(?:76|97)|746|8(?:3[89]|47|51|63)|9(?:80|9[16])","1(?:267|3(?:7[247]|9[278])|466|5(?:47|58|64)|6(?:3[245]|48|5[4-68]))|499[2468]|5(?:76|97)9|7468|8(?:3(?:8[7-9]|96)|477|51[2-9]|636)|9(?:802|9(?:1[23]|69))|1(?:45|58)[67]","1(?:267|3(?:7[247]|9[278])|466|5(?:47|58|64)|6(?:3[245]|48|5[4-68]))|499[2468]|5(?:769|979[2-69])|7468|8(?:3(?:8[7-9]|96[2457-9])|477|51[2-9]|636[457-9])|9(?:802|9(?:1[23]|69))|1(?:45|58)[67]"],"0$1"],["(\\d{2})(\\d{3})(\\d{4})","$1-$2-$3",["60"],"0$1"],["(\\d)(\\d{4})(\\d{4})","$1-$2-$3",["[36]|4(?:2[09]|7[01])","[36]|4(?:2(?:0|9[02-69])|7(?:0[019]|1))"],"0$1"],["(\\d{2})(\\d{3})(\\d{4})","$1-$2-$3",["1(?:1|5[45]|77|88|9[69])|2(?:2[1-37]|3[0-269]|4[59]|5|6[24]|7[1-358]|8[1369]|9[0-38])|4(?:[28][1-9]|3[0-57]|[45]|6[248]|7[2-579]|9[29])|5(?:2|3[045]|4[0-369]|5[29]|8[02389]|9[0-389])|7(?:2[02-46-9]|34|[58]|6[0249]|7[57]|9[2-6])|8(?:2[124589]|3[27-9]|49|51|6|7[0-468]|8[68]|9[019])|9(?:[23][1-9]|4[15]|5[138]|6[1-3]|7[156]|8[189]|9[1-489])","1(?:1|5(?:4[018]|5[017])|77|88|9[69])|2(?:2(?:[127]|3[014-9])|3[0-269]|4[59]|5(?:[1-3]|5[0-69]|9[19])|62|7(?:[1-35]|8[0189])|8(?:[16]|3[0134]|9[0-5])|9(?:[028]|17))|4(?:2(?:[13-79]|8[014-6])|3[0-57]|[45]|6[248]|7[2-47]|8[1-9])|5(?:2|3[045]|4[0-369]|8[02389]|9[0-3])|7(?:2[02-46-9]|34|[58]|6[0249]|7[57]|9(?:[23]|4[0-59]|5[01569]|6[0167]))|8(?:2(?:[1258]|4[0-39]|9[0-2469])|49|51|6(?:[0-24]|36|5[0-3589]|72|9[01459])|7[0-468]|8[68])|9(?:[23][1-9]|4[15]|5[138]|6[1-3]|7[156]|8[189]|9(?:[1289]|3[34]|4[0178]))|(?:49|55|83)[29]|(?:264|837)[016-9]|2(?:57|93)[015-9]|(?:25[0468]|422|838)[01]|(?:47[59]|59[89]|8(?:6[68]|9))[019]","1(?:1|5(?:4[018]|5[017])|77|88|9[69])|2(?:2[127]|3[0-269]|4[59]|5(?:[1-3]|5[0-69]|9(?:17|99))|6(?:2|4[016-9])|7(?:[1-35]|8[0189])|8(?:[16]|3[0134]|9[0-5])|9(?:[028]|17))|4(?:2(?:[13-79]|8[014-6])|3[0-57]|[45]|6[248]|7[2-47]|9[29])|5(?:2|3[045]|4[0-369]|5[29]|8[02389]|9[0-3])|7(?:2[02-46-9]|34|[58]|6[0249]|7[57]|9(?:[23]|4[0-59]|5[01569]|6[0167]))|8(?:2(?:[1258]|4[0-39]|9[0169])|3(?:[29]|7(?:[017-9]|6[6-8]))|49|51|6(?:[0-24]|36[23]|5(?:[0-389]|5[23])|6(?:[01]|9[178])|72|9[0145])|7[0-468]|8[68])|9(?:4[15]|5[138]|7[156]|8[189]|9(?:[1289]|3(?:31|4[357])|4[0178]))|(?:8294|96)[1-3]|2(?:57|93)[015-9]|(?:223|8699)[014-9]|(?:25[0468]|422|838)[01]|(?:48|8292|9[23])[1-9]|(?:47[59]|59[89]|8(?:68|9))[019]","1(?:1|5(?:4[018]|5[017])|77|88|9[69])|2(?:2[127]|3[0-269]|4[59]|5(?:[1-3]|5[0-69]|7[015-9]|9(?:17|99))|6(?:2|4[016-9])|7(?:[1-35]|8[0189])|8(?:[16]|3[0134]|9[0-5])|9(?:[028]|17|3[015-9]))|4(?:2(?:[13-79]|8[014-6])|3[0-57]|[45]|6[248]|7[2-47]|9[29])|5(?:2|3[045]|4[0-369]|5[29]|8[02389]|9[0-3])|7(?:2[02-46-9]|34|[58]|6[0249]|7[57]|9(?:[23]|4[0-59]|5[01569]|6[0167]))|8(?:2(?:[1258]|4[0-39]|9(?:[019]|4[1-3]|6(?:[0-47-9]|5[01346-9])))|3(?:[29]|7(?:[017-9]|6[6-8]))|49|51|6(?:[0-24]|36[23]|5(?:[0-389]|5[23])|6(?:[01]|9[178])|72|9[0145])|7[0-468]|8[68])|9(?:4[15]|5[138]|6[1-3]|7[156]|8[189]|9(?:[1289]|3(?:31|4[357])|4[0178]))|(?:223|8699)[014-9]|(?:25[0468]|422|838)[01]|(?:48|829(?:2|66)|9[23])[1-9]|(?:47[59]|59[89]|8(?:68|9))[019]"],"0$1"],["(\\d{3})(\\d{2})(\\d{4})","$1-$2-$3",["[14]|[289][2-9]|5[3-9]|7[2-4679]"],"0$1"],["(\\d{3})(\\d{3})(\\d{4})","$1-$2-$3",["800"],"0$1"],["(\\d{2})(\\d{4})(\\d{4})","$1-$2-$3",["[257-9]"],"0$1"]],"0"],"KE":["254","000","(?:[17]\\d\\d|900)\\d{6}|(?:2|80)0\\d{6,7}|[4-6]\\d{6,8}",[7,8,9,10],[["(\\d{2})(\\d{5,7})","$1 $2",["[24-6]"],"0$1"],["(\\d{3})(\\d{6})","$1 $2",["[17]"],"0$1"],["(\\d{3})(\\d{3})(\\d{3,4})","$1 $2 $3",["[89]"],"0$1"]],"0"],"KG":["996","00","8\\d{9}|(?:[235-8]\\d|99)\\d{7}",[9,10],[["(\\d{4})(\\d{5})","$1 $2",["3(?:1[346]|[24-79])"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[235-79]|88"],"0$1"],["(\\d{3})(\\d{3})(\\d)(\\d{2,3})","$1 $2 $3 $4",["8"],"0$1"]],"0"],"KH":["855","00[14-9]","1\\d{9}|[1-9]\\d{7,8}",[8,9,10],[["(\\d{2})(\\d{3})(\\d{3,4})","$1 $2 $3",["[1-9]"],"0$1"],["(\\d{4})(\\d{3})(\\d{3})","$1 $2 $3",["1"]]],"0"],"KI":["686","00","(?:[37]\\d|6[0-79])\\d{6}|(?:[2-48]\\d|50)\\d{3}",[5,8],0,"0"],"KM":["269","00","[3478]\\d{6}",[7],[["(\\d{3})(\\d{2})(\\d{2})","$1 $2 $3",["[3478]"]]]],"KN":["1","011","(?:[58]\\d\\d|900)\\d{7}",[10],0,"1",0,"1|([2-7]\\d{6})$","869$1",0,"869"],"KP":["850","00|99","85\\d{6}|(?:19\\d|[2-7])\\d{7}",[8,10],[["(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3",["8"],"0$1"],["(\\d)(\\d{3})(\\d{4})","$1 $2 $3",["[2-7]"],"0$1"],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["1"],"0$1"]],"0"],"KR":["82","00(?:[125689]|3(?:[46]5|91)|7(?:00|27|3|55|6[126]))","00[1-9]\\d{8,11}|(?:[12]|5\\d{3})\\d{7}|[13-6]\\d{9}|(?:[1-6]\\d|80)\\d{7}|[3-6]\\d{4,5}|(?:00|7)0\\d{8}",[5,6,8,9,10,11,12,13,14],[["(\\d{2})(\\d{3,4})","$1-$2",["(?:3[1-3]|[46][1-4]|5[1-5])1"],"0$1"],["(\\d{4})(\\d{4})","$1-$2",["1"]],["(\\d)(\\d{3,4})(\\d{4})","$1-$2-$3",["2"],"0$1"],["(\\d{2})(\\d{3})(\\d{4})","$1-$2-$3",["60|8"],"0$1"],["(\\d{2})(\\d{3,4})(\\d{4})","$1-$2-$3",["[1346]|5[1-5]"],"0$1"],["(\\d{2})(\\d{4})(\\d{4})","$1-$2-$3",["[57]"],"0$1"],["(\\d{2})(\\d{5})(\\d{4})","$1-$2-$3",["5"],"0$1"]],"0",0,"0(8(?:[1-46-8]|5\\d\\d))?"],"KW":["965","00","18\\d{5}|(?:[2569]\\d|41)\\d{6}",[7,8],[["(\\d{4})(\\d{3,4})","$1 $2",["[169]|2(?:[235]|4[1-35-9])|52"]],["(\\d{3})(\\d{5})","$1 $2",["[245]"]]]],"KY":["1","011","(?:345|[58]\\d\\d|900)\\d{7}",[10],0,"1",0,"1|([2-9]\\d{6})$","345$1",0,"345"],"KZ":["7","810","(?:33622|8\\d{8})\\d{5}|[78]\\d{9}",[10,14],0,"8",0,0,0,0,"33|7",0,"8~10"],"LA":["856","00","[23]\\d{9}|3\\d{8}|(?:[235-8]\\d|41)\\d{6}",[8,9,10],[["(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3",["2[13]|3[14]|[4-8]"],"0$1"],["(\\d{2})(\\d{2})(\\d{2})(\\d{3})","$1 $2 $3 $4",["30[013-9]"],"0$1"],["(\\d{2})(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3 $4",["[23]"],"0$1"]],"0"],"LB":["961","00","[27-9]\\d{7}|[13-9]\\d{6}",[7,8],[["(\\d)(\\d{3})(\\d{3})","$1 $2 $3",["[13-69]|7(?:[2-57]|62|8[0-7]|9[04-9])|8[02-9]"],"0$1"],["(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3",["[27-9]"]]],"0"],"LC":["1","011","(?:[58]\\d\\d|758|900)\\d{7}",[10],0,"1",0,"1|([2-8]\\d{6})$","758$1",0,"758"],"LI":["423","00","[68]\\d{8}|(?:[2378]\\d|90)\\d{5}",[7,9],[["(\\d{3})(\\d{2})(\\d{2})","$1 $2 $3",["[2379]|8(?:0[09]|7)","[2379]|8(?:0(?:02|9)|7)"]],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["8"]],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["69"]],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["6"]]],"0",0,"0|(1001)"],"LK":["94","00","[1-9]\\d{8}",[9],[["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["7"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[1-689]"],"0$1"]],"0"],"LR":["231","00","(?:2|33|5\\d|77|88)\\d{7}|[4-6]\\d{6}",[7,8,9],[["(\\d)(\\d{3})(\\d{3})","$1 $2 $3",["[4-6]"],"0$1"],["(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3",["2"],"0$1"],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["[3578]"],"0$1"]],"0"],"LS":["266","00","(?:[256]\\d\\d|800)\\d{5}",[8],[["(\\d{4})(\\d{4})","$1 $2",["[2568]"]]]],"LT":["370","00","(?:[3469]\\d|52|[78]0)\\d{6}",[8],[["(\\d)(\\d{3})(\\d{4})","$1 $2 $3",["52[0-7]"],"(8-$1)",1],["(\\d{3})(\\d{2})(\\d{3})","$1 $2 $3",["[7-9]"],"8 $1",1],["(\\d{2})(\\d{6})","$1 $2",["37|4(?:[15]|6[1-8])"],"(8-$1)",1],["(\\d{3})(\\d{5})","$1 $2",["[3-6]"],"(8-$1)",1]],"8",0,"[08]"],"LU":["352","00","35[013-9]\\d{4,8}|6\\d{8}|35\\d{2,4}|(?:[2457-9]\\d|3[0-46-9])\\d{2,9}",[4,5,6,7,8,9,10,11],[["(\\d{2})(\\d{3})","$1 $2",["2(?:0[2-689]|[2-9])|[3-57]|8(?:0[2-9]|[13-9])|9(?:0[89]|[2-579])"]],["(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3",["2(?:0[2-689]|[2-9])|[3-57]|8(?:0[2-9]|[13-9])|9(?:0[89]|[2-579])"]],["(\\d{2})(\\d{2})(\\d{3})","$1 $2 $3",["20[2-689]"]],["(\\d{2})(\\d{2})(\\d{2})(\\d{1,2})","$1 $2 $3 $4",["2(?:[0367]|4[3-8])"]],["(\\d{3})(\\d{2})(\\d{3})","$1 $2 $3",["80[01]|90[015]"]],["(\\d{2})(\\d{2})(\\d{2})(\\d{3})","$1 $2 $3 $4",["20"]],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["6"]],["(\\d{2})(\\d{2})(\\d{2})(\\d{2})(\\d{1,2})","$1 $2 $3 $4 $5",["2(?:[0367]|4[3-8])"]],["(\\d{2})(\\d{2})(\\d{2})(\\d{1,5})","$1 $2 $3 $4",["[3-57]|8[13-9]|9(?:0[89]|[2-579])|(?:2|80)[2-9]"]]],0,0,"(15(?:0[06]|1[12]|[35]5|4[04]|6[26]|77|88|99)\\d)"],"LV":["371","00","(?:[268]\\d|90)\\d{6}",[8],[["(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3",["[269]|8[01]"]]]],"LY":["218","00","[2-9]\\d{8}",[9],[["(\\d{2})(\\d{7})","$1-$2",["[2-9]"],"0$1"]],"0"],"MA":["212","00","[5-8]\\d{8}",[9],[["(\\d{5})(\\d{4})","$1-$2",["5(?:29|38)","5(?:29[89]|389)","5(?:29[89]|389)0"],"0$1"],["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["5[45]"],"0$1"],["(\\d{4})(\\d{5})","$1-$2",["5(?:2[2-489]|3[5-9]|9)|892","5(?:2(?:[2-49]|8[235-9])|3[5-9]|9)|892"],"0$1"],["(\\d{2})(\\d{7})","$1-$2",["8"],"0$1"],["(\\d{3})(\\d{6})","$1-$2",["[5-7]"],"0$1"]],"0",0,0,0,0,0,[["5(?:29(?:[189][05]|2[29]|3[01])|389[05])\\d{4}|5(?:2(?:[0-25-7]\\d|3[1-578]|4[02-46-8]|8[0235-7]|90)|3(?:[0-47]\\d|5[02-9]|6[02-8]|8[08]|9[3-9])|(?:4[067]|5[03])\\d)\\d{5}"],["(?:6(?:[0-79]\\d|8[0-247-9])|7(?:[017]\\d|2[0-2]|6[0-367]))\\d{6}"],["80\\d{7}"],["89\\d{7}"],0,0,0,0,["592(?:4[0-2]|93)\\d{4}"]]],"MC":["377","00","(?:[3489]|6\\d)\\d{7}",[8,9],[["(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3",["4"],"0$1"],["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[389]"]],["(\\d)(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4 $5",["6"],"0$1"]],"0"],"MD":["373","00","(?:[235-7]\\d|[89]0)\\d{6}",[8],[["(\\d{3})(\\d{5})","$1 $2",["[89]"],"0$1"],["(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3",["22|3"],"0$1"],["(\\d{3})(\\d{2})(\\d{3})","$1 $2 $3",["[25-7]"],"0$1"]],"0"],"ME":["382","00","(?:20|[3-79]\\d)\\d{6}|80\\d{6,7}",[8,9],[["(\\d{2})(\\d{3})(\\d{3,4})","$1 $2 $3",["[2-9]"],"0$1"]],"0"],"MF":["590","00","(?:590|(?:69|80)\\d|976)\\d{6}",[9],0,"0",0,0,0,0,0,[["590(?:0[079]|[14]3|[27][79]|30|5[0-268]|87)\\d{4}"],["69(?:0\\d\\d|1(?:2[2-9]|3[0-5]))\\d{4}"],["80[0-5]\\d{6}"],0,0,0,0,0,["976[01]\\d{5}"]]],"MG":["261","00","[23]\\d{8}",[9],[["(\\d{2})(\\d{2})(\\d{3})(\\d{2})","$1 $2 $3 $4",["[23]"],"0$1"]],"0",0,"0|([24-9]\\d{6})$","20$1"],"MH":["692","011","329\\d{4}|(?:[256]\\d|45)\\d{5}",[7],[["(\\d{3})(\\d{4})","$1-$2",["[2-6]"]]],"1"],"MK":["389","00","[2-578]\\d{7}",[8],[["(\\d)(\\d{3})(\\d{4})","$1 $2 $3",["2|34[47]|4(?:[37]7|5[47]|64)"],"0$1"],["(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3",["[347]"],"0$1"],["(\\d{3})(\\d)(\\d{2})(\\d{2})","$1 $2 $3 $4",["[58]"],"0$1"]],"0"],"ML":["223","00","[24-9]\\d{7}",[8],[["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[24-9]"]]]],"MM":["95","00","1\\d{5,7}|95\\d{6}|(?:[4-7]|9[0-46-9])\\d{6,8}|(?:2|8\\d)\\d{5,8}",[6,7,8,9,10],[["(\\d)(\\d{2})(\\d{3})","$1 $2 $3",["16|2"],"0$1"],["(\\d{2})(\\d{2})(\\d{3})","$1 $2 $3",["[45]|6(?:0[23]|[1-689]|7[235-7])|7(?:[0-4]|5[2-7])|8[1-6]"],"0$1"],["(\\d)(\\d{3})(\\d{3,4})","$1 $2 $3",["[12]"],"0$1"],["(\\d{2})(\\d{3})(\\d{3,4})","$1 $2 $3",["[4-7]|8[1-35]"],"0$1"],["(\\d)(\\d{3})(\\d{4,6})","$1 $2 $3",["9(?:2[0-4]|[35-9]|4[137-9])"],"0$1"],["(\\d)(\\d{4})(\\d{4})","$1 $2 $3",["2"],"0$1"],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["8"],"0$1"],["(\\d)(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3 $4",["92"],"0$1"],["(\\d)(\\d{5})(\\d{4})","$1 $2 $3",["9"],"0$1"]],"0"],"MN":["976","001","[12]\\d{7,9}|[57-9]\\d{7}",[8,9,10],[["(\\d{2})(\\d{2})(\\d{4})","$1 $2 $3",["[12]1"],"0$1"],["(\\d{4})(\\d{4})","$1 $2",["[57-9]"]],["(\\d{3})(\\d{5,6})","$1 $2",["[12]2[1-3]"],"0$1"],["(\\d{4})(\\d{5,6})","$1 $2",["[12](?:27|3[2-8]|4[2-68]|5[1-4689])","[12](?:27|3[2-8]|4[2-68]|5[1-4689])[0-3]"],"0$1"],["(\\d{5})(\\d{4,5})","$1 $2",["[12]"],"0$1"]],"0"],"MO":["853","00","0800\\d{3}|(?:28|[68]\\d)\\d{6}",[7,8],[["(\\d{4})(\\d{3})","$1 $2",["0"]],["(\\d{4})(\\d{4})","$1 $2",["[268]"]]]],"MP":["1","011","[58]\\d{9}|(?:67|90)0\\d{7}",[10],0,"1",0,"1|([2-9]\\d{6})$","670$1",0,"670"],"MQ":["596","00","(?:69|80)\\d{7}|(?:59|97)6\\d{6}",[9],[["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[569]"],"0$1"],["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["8"],"0$1"]],"0"],"MR":["222","00","(?:[2-4]\\d\\d|800)\\d{5}",[8],[["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[2-48]"]]]],"MS":["1","011","(?:[58]\\d\\d|664|900)\\d{7}",[10],0,"1",0,"1|([34]\\d{6})$","664$1",0,"664"],"MT":["356","00","3550\\d{4}|(?:[2579]\\d\\d|800)\\d{5}",[8],[["(\\d{4})(\\d{4})","$1 $2",["[2357-9]"]]]],"MU":["230","0(?:0|[24-7]0|3[03])","(?:5|8\\d\\d)\\d{7}|[2-468]\\d{6}",[7,8,10],[["(\\d{3})(\\d{4})","$1 $2",["[2-46]|8[013]"]],["(\\d{4})(\\d{4})","$1 $2",["5"]],["(\\d{5})(\\d{5})","$1 $2",["8"]]],0,0,0,0,0,0,0,"020"],"MV":["960","0(?:0|19)","(?:800|9[0-57-9]\\d)\\d{7}|[34679]\\d{6}",[7,10],[["(\\d{3})(\\d{4})","$1-$2",["[3467]|9[13-9]"]],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["[89]"]]],0,0,0,0,0,0,0,"00"],"MW":["265","00","(?:[129]\\d|31|77|88)\\d{7}|1\\d{6}",[7,9],[["(\\d)(\\d{3})(\\d{3})","$1 $2 $3",["1[2-9]"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["2"],"0$1"],["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[137-9]"],"0$1"]],"0"],"MX":["52","0[09]","1(?:(?:44|99)[1-9]|65[0-689])\\d{7}|(?:1(?:[017]\\d|[235][1-9]|4[0-35-9]|6[0-46-9]|8[1-79]|9[1-8])|[2-9]\\d)\\d{8}",[10,11],[["(\\d{2})(\\d{4})(\\d{4})","$1 $2 $3",["33|5[56]|81"],0,1],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["[2-9]"],0,1],["(\\d)(\\d{2})(\\d{4})(\\d{4})","$2 $3 $4",["1(?:33|5[56]|81)"],0,1],["(\\d)(\\d{3})(\\d{3})(\\d{4})","$2 $3 $4",["1"],0,1]],"01",0,"0(?:[12]|4[45])|1",0,0,0,0,"00"],"MY":["60","00","1\\d{8,9}|(?:3\\d|[4-9])\\d{7}",[8,9,10],[["(\\d)(\\d{3})(\\d{4})","$1-$2 $3",["[4-79]"],"0$1"],["(\\d{2})(\\d{3})(\\d{3,4})","$1-$2 $3",["1(?:[02469]|[378][1-9])|8"],"0$1"],["(\\d)(\\d{4})(\\d{4})","$1-$2 $3",["3"],"0$1"],["(\\d)(\\d{3})(\\d{2})(\\d{4})","$1-$2-$3-$4",["1[36-8]"]],["(\\d{3})(\\d{3})(\\d{4})","$1-$2 $3",["15"],"0$1"],["(\\d{2})(\\d{4})(\\d{4})","$1-$2 $3",["1"],"0$1"]],"0"],"MZ":["258","00","(?:2|8\\d)\\d{7}",[8,9],[["(\\d{2})(\\d{3})(\\d{3,4})","$1 $2 $3",["2|8[2-79]"]],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["8"]]]],"NA":["264","00","[68]\\d{7,8}",[8,9],[["(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3",["88"],"0$1"],["(\\d{2})(\\d{3})(\\d{3,4})","$1 $2 $3",["6"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["87"],"0$1"],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["8"],"0$1"]],"0"],"NC":["687","00","(?:050|[2-57-9]\\d\\d)\\d{3}",[6],[["(\\d{2})(\\d{2})(\\d{2})","$1.$2.$3",["[02-57-9]"]]]],"NE":["227","00","[027-9]\\d{7}",[8],[["(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3",["08"]],["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[089]|2[013]|7[04]"]]]],"NF":["672","00","[13]\\d{5}",[6],[["(\\d{2})(\\d{4})","$1 $2",["1[0-3]"]],["(\\d)(\\d{5})","$1 $2",["[13]"]]],0,0,"([0-258]\\d{4})$","3$1"],"NG":["234","009","(?:[124-7]|9\\d{3})\\d{6}|[1-9]\\d{7}|[78]\\d{9,13}",[7,8,10,11,12,13,14],[["(\\d{2})(\\d{2})(\\d{3})","$1 $2 $3",["78"],"0$1"],["(\\d)(\\d{3})(\\d{3,4})","$1 $2 $3",["[12]|9(?:0[3-9]|[1-9])"],"0$1"],["(\\d{2})(\\d{3})(\\d{2,3})","$1 $2 $3",["[3-7]|8[2-9]"],"0$1"],["(\\d{3})(\\d{3})(\\d{3,4})","$1 $2 $3",["[7-9]"],"0$1"],["(\\d{3})(\\d{4})(\\d{4,5})","$1 $2 $3",["[78]"],"0$1"],["(\\d{3})(\\d{5})(\\d{5,6})","$1 $2 $3",["[78]"],"0$1"]],"0"],"NI":["505","00","(?:1800|[25-8]\\d{3})\\d{4}",[8],[["(\\d{4})(\\d{4})","$1 $2",["[125-8]"]]]],"NL":["31","00","(?:[124-7]\\d\\d|3(?:[02-9]\\d|1[0-8]))\\d{6}|8\\d{6,9}|9\\d{6,10}|1\\d{4,5}",[5,6,7,8,9,10,11],[["(\\d{3})(\\d{4,7})","$1 $2",["[89]0"],"0$1"],["(\\d{2})(\\d{7})","$1 $2",["66"],"0$1"],["(\\d)(\\d{8})","$1 $2",["6"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["1[16-8]|2[259]|3[124]|4[17-9]|5[124679]"],"0$1"],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["[1-578]|91"],"0$1"],["(\\d{3})(\\d{3})(\\d{5})","$1 $2 $3",["9"],"0$1"]],"0"],"NO":["47","00","(?:0|[2-9]\\d{3})\\d{4}",[5,8],[["(\\d{3})(\\d{2})(\\d{3})","$1 $2 $3",["[489]|59"]],["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[235-7]"]]],0,0,0,0,0,"[02-689]|7[0-8]"],"NP":["977","00","(?:1\\d|9)\\d{9}|[1-9]\\d{7}",[8,10,11],[["(\\d)(\\d{7})","$1-$2",["1[2-6]"],"0$1"],["(\\d{2})(\\d{6})","$1-$2",["1[01]|[2-8]|9(?:[1-579]|6[2-6])"],"0$1"],["(\\d{3})(\\d{7})","$1-$2",["9"]]],"0"],"NR":["674","00","(?:444|(?:55|8\\d)\\d|666)\\d{4}",[7],[["(\\d{3})(\\d{4})","$1 $2",["[4-68]"]]]],"NU":["683","00","(?:[47]|888\\d)\\d{3}",[4,7],[["(\\d{3})(\\d{4})","$1 $2",["8"]]]],"NZ":["64","0(?:0|161)","[29]\\d{7,9}|50\\d{5}(?:\\d{2,3})?|6[0-35-9]\\d{6}|7\\d{7,8}|8\\d{4,9}|(?:11\\d|[34])\\d{7}",[5,6,7,8,9,10],[["(\\d{2})(\\d{3,8})","$1 $2",["8[1-579]"],"0$1"],["(\\d{3})(\\d{2})(\\d{2,3})","$1 $2 $3",["50[036-8]|[89]0","50(?:[0367]|88)|[89]0"],"0$1"],["(\\d)(\\d{3})(\\d{4})","$1-$2 $3",["24|[346]|7[2-57-9]|9[2-9]"],"0$1"],["(\\d{3})(\\d{3})(\\d{3,4})","$1 $2 $3",["2(?:10|74)|[59]|80"],"0$1"],["(\\d{2})(\\d{3,4})(\\d{4})","$1 $2 $3",["1|2[028]"],"0$1"],["(\\d{2})(\\d{3})(\\d{3,5})","$1 $2 $3",["2(?:[169]|7[0-35-9])|7|86"],"0$1"]],"0",0,0,0,0,0,0,"00"],"OM":["968","00","(?:1505|[279]\\d{3}|500)\\d{4}|800\\d{5,6}",[7,8,9],[["(\\d{3})(\\d{4,6})","$1 $2",["[58]"]],["(\\d{2})(\\d{6})","$1 $2",["2"]],["(\\d{4})(\\d{4})","$1 $2",["[179]"]]]],"PA":["507","00","(?:00800|8\\d{3})\\d{6}|[68]\\d{7}|[1-57-9]\\d{6}",[7,8,10,11],[["(\\d{3})(\\d{4})","$1-$2",["[1-57-9]"]],["(\\d{4})(\\d{4})","$1-$2",["[68]"]],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["8"]]]],"PE":["51","19(?:1[124]|77|90)00","(?:[14-8]|9\\d)\\d{7}",[8,9],[["(\\d{3})(\\d{5})","$1 $2",["80"],"(0$1)"],["(\\d)(\\d{7})","$1 $2",["1"],"(0$1)"],["(\\d{2})(\\d{6})","$1 $2",["[4-8]"],"(0$1)"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["9"]]],"0",0,0,0,0,0,0,0," Anexo "],"PF":["689","00","4\\d{5}(?:\\d{2})?|8\\d{7,8}",[6,8,9],[["(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3",["44"]],["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["4|8[7-9]"]],["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["8"]]]],"PG":["675","00|140[1-3]","(?:180|[78]\\d{3})\\d{4}|(?:[2-589]\\d|64)\\d{5}",[7,8],[["(\\d{3})(\\d{4})","$1 $2",["18|[2-69]|85"]],["(\\d{4})(\\d{4})","$1 $2",["[78]"]]],0,0,0,0,0,0,0,"00"],"PH":["63","00","(?:[2-7]|9\\d)\\d{8}|2\\d{5}|(?:1800|8)\\d{7,9}",[6,8,9,10,11,12,13],[["(\\d)(\\d{5})","$1 $2",["2"],"(0$1)"],["(\\d{4})(\\d{4,6})","$1 $2",["3(?:23|39|46)|4(?:2[3-6]|[35]9|4[26]|76)|544|88[245]|(?:52|64|86)2","3(?:230|397|461)|4(?:2(?:35|[46]4|51)|396|4(?:22|63)|59[347]|76[15])|5(?:221|446)|642[23]|8(?:622|8(?:[24]2|5[13]))"],"(0$1)"],["(\\d{5})(\\d{4})","$1 $2",["346|4(?:27|9[35])|883","3469|4(?:279|9(?:30|56))|8834"],"(0$1)"],["(\\d)(\\d{4})(\\d{4})","$1 $2 $3",["2"],"(0$1)"],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["[3-7]|8[2-8]"],"(0$1)"],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["[89]"],"0$1"],["(\\d{4})(\\d{3})(\\d{4})","$1 $2 $3",["1"]],["(\\d{4})(\\d{1,2})(\\d{3})(\\d{4})","$1 $2 $3 $4",["1"]]],"0"],"PK":["92","00","122\\d{6}|[24-8]\\d{10,11}|9(?:[013-9]\\d{8,10}|2(?:[01]\\d\\d|2(?:[06-8]\\d|1[01]))\\d{7})|(?:[2-8]\\d{3}|92(?:[0-7]\\d|8[1-9]))\\d{6}|[24-9]\\d{8}|[89]\\d{7}",[8,9,10,11,12],[["(\\d{3})(\\d{3})(\\d{2,7})","$1 $2 $3",["[89]0"],"0$1"],["(\\d{4})(\\d{5})","$1 $2",["1"]],["(\\d{3})(\\d{6,7})","$1 $2",["2(?:3[2358]|4[2-4]|9[2-8])|45[3479]|54[2-467]|60[468]|72[236]|8(?:2[2-689]|3[23578]|4[3478]|5[2356])|9(?:2[2-8]|3[27-9]|4[2-6]|6[3569]|9[25-8])","9(?:2[3-8]|98)|(?:2(?:3[2358]|4[2-4]|9[2-8])|45[3479]|54[2-467]|60[468]|72[236]|8(?:2[2-689]|3[23578]|4[3478]|5[2356])|9(?:22|3[27-9]|4[2-6]|6[3569]|9[25-7]))[2-9]"],"(0$1)"],["(\\d{2})(\\d{7,8})","$1 $2",["(?:2[125]|4[0-246-9]|5[1-35-7]|6[1-8]|7[14]|8[16]|91)[2-9]"],"(0$1)"],["(\\d{5})(\\d{5})","$1 $2",["58"],"(0$1)"],["(\\d{3})(\\d{7})","$1 $2",["3"],"0$1"],["(\\d{2})(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3 $4",["2[125]|4[0-246-9]|5[1-35-7]|6[1-8]|7[14]|8[16]|91"],"(0$1)"],["(\\d{3})(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3 $4",["[24-9]"],"(0$1)"]],"0"],"PL":["48","00","6\\d{5}(?:\\d{2})?|8\\d{9}|[1-9]\\d{6}(?:\\d{2})?",[6,7,8,9,10],[["(\\d{5})","$1",["19"]],["(\\d{3})(\\d{3})","$1 $2",["11|64"]],["(\\d{2})(\\d{2})(\\d{3})","$1 $2 $3",["(?:1[2-8]|2[2-69]|3[2-4]|4[1-468]|5[24-689]|6[1-3578]|7[14-7]|8[1-79]|9[145])1","(?:1[2-8]|2[2-69]|3[2-4]|4[1-468]|5[24-689]|6[1-3578]|7[14-7]|8[1-79]|9[145])19"]],["(\\d{3})(\\d{2})(\\d{2,3})","$1 $2 $3",["64"]],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["21|39|45|5[0137]|6[0469]|7[02389]|8(?:0[14]|8)"]],["(\\d{2})(\\d{3})(\\d{2})(\\d{2})","$1 $2 $3 $4",["1[2-8]|[2-7]|8[1-79]|9[145]"]],["(\\d{3})(\\d{3})(\\d{3,4})","$1 $2 $3",["8"]]]],"PM":["508","00","(?:[45]|80\\d\\d)\\d{5}",[6,9],[["(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3",["[45]"],"0$1"],["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["8"],"0$1"]],"0"],"PR":["1","011","(?:[589]\\d\\d|787)\\d{7}",[10],0,"1",0,0,0,0,"787|939"],"PS":["970","00","[2489]2\\d{6}|(?:1\\d|5)\\d{8}",[8,9,10],[["(\\d)(\\d{3})(\\d{4})","$1 $2 $3",["[2489]"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["5"],"0$1"],["(\\d{4})(\\d{3})(\\d{3})","$1 $2 $3",["1"]]],"0"],"PT":["351","00","1693\\d{5}|(?:[26-9]\\d|30)\\d{7}",[9],[["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["2[12]"]],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["16|[236-9]"]]]],"PW":["680","01[12]","(?:[24-8]\\d\\d|345|900)\\d{4}",[7],[["(\\d{3})(\\d{4})","$1 $2",["[2-9]"]]]],"PY":["595","00","59\\d{4,6}|9\\d{5,10}|(?:[2-46-8]\\d|5[0-8])\\d{4,7}",[6,7,8,9,10,11],[["(\\d{3})(\\d{3,6})","$1 $2",["[2-9]0"],"0$1"],["(\\d{2})(\\d{5})","$1 $2",["[26]1|3[289]|4[1246-8]|7[1-3]|8[1-36]"],"(0$1)"],["(\\d{3})(\\d{4,5})","$1 $2",["2[279]|3[13-5]|4[359]|5|6(?:[34]|7[1-46-8])|7[46-8]|85"],"(0$1)"],["(\\d{2})(\\d{3})(\\d{3,4})","$1 $2 $3",["2[14-68]|3[26-9]|4[1246-8]|6(?:1|75)|7[1-35]|8[1-36]"],"(0$1)"],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["87"]],["(\\d{3})(\\d{6})","$1 $2",["9(?:[5-79]|8[1-6])"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[2-8]"],"0$1"],["(\\d{4})(\\d{3})(\\d{4})","$1 $2 $3",["9"]]],"0"],"QA":["974","00","[2-7]\\d{7}|800\\d{4}(?:\\d{2})?|2\\d{6}",[7,8,9],[["(\\d{3})(\\d{4})","$1 $2",["2[126]|8"]],["(\\d{4})(\\d{4})","$1 $2",["[2-7]"]]]],"RE":["262","00","9769\\d{5}|(?:26|[68]\\d)\\d{7}",[9],[["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[2689]"],"0$1"]],"0",0,0,0,0,"26[23]|69|[89]"],"RO":["40","00","(?:[2378]\\d|90)\\d{7}|[23]\\d{5}",[6,9],[["(\\d{3})(\\d{3})","$1 $2",["2[3-6]","2[3-6]\\d9"],"0$1"],["(\\d{2})(\\d{4})","$1 $2",["219|31"],"0$1"],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["[23]1"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[237-9]"],"0$1"]],"0",0,0,0,0,0,0,0," int "],"RS":["381","00","38[02-9]\\d{6,9}|6\\d{7,9}|90\\d{4,8}|38\\d{5,6}|(?:7\\d\\d|800)\\d{3,9}|(?:[12]\\d|3[0-79])\\d{5,10}",[6,7,8,9,10,11,12],[["(\\d{3})(\\d{3,9})","$1 $2",["(?:2[389]|39)0|[7-9]"],"0$1"],["(\\d{2})(\\d{5,10})","$1 $2",["[1-36]"],"0$1"]],"0"],"RU":["7","810","8\\d{13}|[347-9]\\d{9}",[10,14],[["(\\d{4})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["7(?:1[0-8]|2[1-9])","7(?:1(?:[0-6]2|7|8[27])|2(?:1[23]|[2-9]2))","7(?:1(?:[0-6]2|7|8[27])|2(?:13[03-69]|62[013-9]))|72[1-57-9]2"],"8 ($1)",1],["(\\d{5})(\\d)(\\d{2})(\\d{2})","$1 $2 $3 $4",["7(?:1[0-68]|2[1-9])","7(?:1(?:[06][3-6]|[18]|2[35]|[3-5][3-5])|2(?:[13][3-5]|[24-689]|7[457]))","7(?:1(?:0(?:[356]|4[023])|[18]|2(?:3[013-9]|5)|3[45]|43[013-79]|5(?:3[1-8]|4[1-7]|5)|6(?:3[0-35-9]|[4-6]))|2(?:1(?:3[178]|[45])|[24-689]|3[35]|7[457]))|7(?:14|23)4[0-8]|71(?:33|45)[1-79]"],"8 ($1)",1],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["7"],"8 ($1)",1],["(\\d{3})(\\d{3})(\\d{2})(\\d{2})","$1 $2-$3-$4",["[349]|8(?:[02-7]|1[1-8])"],"8 ($1)",1],["(\\d{4})(\\d{4})(\\d{3})(\\d{3})","$1 $2 $3 $4",["8"],"8 ($1)"]],"8",0,0,0,0,"3[04-689]|[489]",0,"8~10"],"RW":["250","00","(?:06|[27]\\d\\d|[89]00)\\d{6}",[8,9],[["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["0"]],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[7-9]"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["2"]]],"0"],"SA":["966","00","92\\d{7}|(?:[15]|8\\d)\\d{8}",[9,10],[["(\\d{4})(\\d{5})","$1 $2",["9"]],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["1"],"0$1"],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["5"],"0$1"],["(\\d{3})(\\d{3})(\\d{3,4})","$1 $2 $3",["81"],"0$1"],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["8"]]],"0"],"SB":["677","0[01]","(?:[1-6]|[7-9]\\d\\d)\\d{4}",[5,7],[["(\\d{2})(\\d{5})","$1 $2",["7|8[4-9]|9(?:[1-8]|9[0-8])"]]]],"SC":["248","010|0[0-2]","800\\d{4}|(?:[249]\\d|64)\\d{5}",[7],[["(\\d)(\\d{3})(\\d{3})","$1 $2 $3",["[246]|9[57]"]]],0,0,0,0,0,0,0,"00"],"SD":["249","00","[19]\\d{8}",[9],[["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["[19]"],"0$1"]],"0"],"SE":["46","00","(?:[26]\\d\\d|9)\\d{9}|[1-9]\\d{8}|[1-689]\\d{7}|[1-4689]\\d{6}|2\\d{5}",[6,7,8,9,10],[["(\\d{2})(\\d{2,3})(\\d{2})","$1-$2 $3",["20"],"0$1",0,"$1 $2 $3"],["(\\d{3})(\\d{4})","$1-$2",["9(?:00|39|44|9)"],"0$1",0,"$1 $2"],["(\\d{2})(\\d{3})(\\d{2})","$1-$2 $3",["[12][136]|3[356]|4[0246]|6[03]|90[1-9]"],"0$1",0,"$1 $2 $3"],["(\\d)(\\d{2,3})(\\d{2})(\\d{2})","$1-$2 $3 $4",["8"],"0$1",0,"$1 $2 $3 $4"],["(\\d{3})(\\d{2,3})(\\d{2})","$1-$2 $3",["1[2457]|2(?:[247-9]|5[0138])|3[0247-9]|4[1357-9]|5[0-35-9]|6(?:[125689]|4[02-57]|7[0-2])|9(?:[125-8]|3[02-5]|4[0-3])"],"0$1",0,"$1 $2 $3"],["(\\d{3})(\\d{2,3})(\\d{3})","$1-$2 $3",["9(?:00|39|44)"],"0$1",0,"$1 $2 $3"],["(\\d{2})(\\d{2,3})(\\d{2})(\\d{2})","$1-$2 $3 $4",["1[13689]|2[0136]|3[1356]|4[0246]|54|6[03]|90[1-9]"],"0$1",0,"$1 $2 $3 $4"],["(\\d{2})(\\d{3})(\\d{2})(\\d{2})","$1-$2 $3 $4",["10|7"],"0$1",0,"$1 $2 $3 $4"],["(\\d)(\\d{3})(\\d{3})(\\d{2})","$1-$2 $3 $4",["8"],"0$1",0,"$1 $2 $3 $4"],["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1-$2 $3 $4",["[13-5]|2(?:[247-9]|5[0138])|6(?:[124-689]|7[0-2])|9(?:[125-8]|3[02-5]|4[0-3])"],"0$1",0,"$1 $2 $3 $4"],["(\\d{3})(\\d{2})(\\d{2})(\\d{3})","$1-$2 $3 $4",["9"],"0$1",0,"$1 $2 $3 $4"],["(\\d{3})(\\d{2})(\\d{3})(\\d{2})(\\d{2})","$1-$2 $3 $4 $5",["[26]"],"0$1",0,"$1 $2 $3 $4 $5"]],"0"],"SG":["65","0[0-3]\\d","(?:(?:1\\d|8)\\d\\d|7000)\\d{7}|[3689]\\d{7}",[8,10,11],[["(\\d{4})(\\d{4})","$1 $2",["[369]|8(?:0[1-5]|[1-9])"]],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["8"]],["(\\d{4})(\\d{4})(\\d{3})","$1 $2 $3",["7"]],["(\\d{4})(\\d{3})(\\d{4})","$1 $2 $3",["1"]]]],"SH":["290","00","(?:[256]\\d|8)\\d{3}",[4,5],0,0,0,0,0,0,"[256]"],"SI":["386","00|10(?:22|66|88|99)","[1-7]\\d{7}|8\\d{4,7}|90\\d{4,6}",[5,6,7,8],[["(\\d{2})(\\d{3,6})","$1 $2",["8[09]|9"],"0$1"],["(\\d{3})(\\d{5})","$1 $2",["59|8"],"0$1"],["(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3",["[37][01]|4[0139]|51|6"],"0$1"],["(\\d)(\\d{3})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[1-57]"],"(0$1)"]],"0",0,0,0,0,0,0,"00"],"SJ":["47","00","0\\d{4}|(?:[489]\\d|[57]9)\\d{6}",[5,8],0,0,0,0,0,0,"79"],"SK":["421","00","[2-689]\\d{8}|[2-59]\\d{6}|[2-5]\\d{5}",[6,7,9],[["(\\d)(\\d{2})(\\d{3,4})","$1 $2 $3",["21"],"0$1"],["(\\d{2})(\\d{2})(\\d{2,3})","$1 $2 $3",["[3-5][1-8]1","[3-5][1-8]1[67]"],"0$1"],["(\\d)(\\d{3})(\\d{3})(\\d{2})","$1/$2 $3 $4",["2"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[689]"],"0$1"],["(\\d{2})(\\d{3})(\\d{2})(\\d{2})","$1/$2 $3 $4",["[3-5]"],"0$1"]],"0"],"SL":["232","00","(?:[237-9]\\d|66)\\d{6}",[8],[["(\\d{2})(\\d{6})","$1 $2",["[236-9]"],"(0$1)"]],"0"],"SM":["378","00","(?:0549|[5-7]\\d)\\d{6}",[8,10],[["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[5-7]"]],["(\\d{4})(\\d{6})","$1 $2",["0"]]],0,0,"([89]\\d{5})$","0549$1"],"SN":["221","00","(?:[378]\\d|93)\\d{7}",[9],[["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["8"]],["(\\d{2})(\\d{3})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[379]"]]]],"SO":["252","00","[346-9]\\d{8}|[12679]\\d{7}|[1-5]\\d{6}|[1348]\\d{5}",[6,7,8,9],[["(\\d{2})(\\d{4})","$1 $2",["8[125]"]],["(\\d{6})","$1",["[134]"]],["(\\d)(\\d{6})","$1 $2",["[15]|2[0-79]|3[0-46-8]|4[0-7]"]],["(\\d)(\\d{7})","$1 $2",["24|[67]"]],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[3478]|64|90"]],["(\\d{2})(\\d{5,7})","$1 $2",["1|28|6(?:0[5-7]|[1-35-9])|9[2-9]"]]],"0"],"SR":["597","00","(?:[2-5]|68|[78]\\d)\\d{5}",[6,7],[["(\\d{2})(\\d{2})(\\d{2})","$1-$2-$3",["56"]],["(\\d{3})(\\d{3})","$1-$2",["[2-5]"]],["(\\d{3})(\\d{4})","$1-$2",["[6-8]"]]]],"SS":["211","00","[19]\\d{8}",[9],[["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[19]"],"0$1"]],"0"],"ST":["239","00","(?:22|9\\d)\\d{5}",[7],[["(\\d{3})(\\d{4})","$1 $2",["[29]"]]]],"SV":["503","00","[267]\\d{7}|[89]00\\d{4}(?:\\d{4})?",[7,8,11],[["(\\d{3})(\\d{4})","$1 $2",["[89]"]],["(\\d{4})(\\d{4})","$1 $2",["[267]"]],["(\\d{3})(\\d{4})(\\d{4})","$1 $2 $3",["[89]"]]]],"SX":["1","011","7215\\d{6}|(?:[58]\\d\\d|900)\\d{7}",[10],0,"1",0,"1|(5\\d{6})$","721$1",0,"721"],"SY":["963","00","[1-39]\\d{8}|[1-5]\\d{7}",[8,9],[["(\\d{2})(\\d{3})(\\d{3,4})","$1 $2 $3",["[1-5]"],"0$1",1],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["9"],"0$1",1]],"0"],"SZ":["268","00","0800\\d{4}|(?:[237]\\d|900)\\d{6}",[8,9],[["(\\d{4})(\\d{4})","$1 $2",["[0237]"]],["(\\d{5})(\\d{4})","$1 $2",["9"]]]],"TA":["290","00","8\\d{3}",[4],0,0,0,0,0,0,"8"],"TC":["1","011","(?:[58]\\d\\d|649|900)\\d{7}",[10],0,"1",0,"1|([2-479]\\d{6})$","649$1",0,"649"],"TD":["235","00|16","(?:22|[69]\\d|77)\\d{6}",[8],[["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[2679]"]]],0,0,0,0,0,0,0,"00"],"TG":["228","00","[279]\\d{7}",[8],[["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[279]"]]]],"TH":["66","00[1-9]","(?:001800|[2-57]|[689]\\d)\\d{7}|1\\d{7,9}",[8,9,10,13],[["(\\d)(\\d{3})(\\d{4})","$1 $2 $3",["2"],"0$1"],["(\\d{2})(\\d{3})(\\d{3,4})","$1 $2 $3",["[13-9]"],"0$1"],["(\\d{4})(\\d{3})(\\d{3})","$1 $2 $3",["1"]]],"0"],"TJ":["992","810","(?:00|[1-57-9]\\d)\\d{7}",[9],[["(\\d{6})(\\d)(\\d{2})","$1 $2 $3",["331","3317"]],["(\\d{3})(\\d{2})(\\d{4})","$1 $2 $3",["[34]7|91[78]"]],["(\\d{4})(\\d)(\\d{4})","$1 $2 $3",["3[1-5]"]],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["[0-57-9]"]]],0,0,0,0,0,0,0,"8~10"],"TK":["690","00","[2-47]\\d{3,6}",[4,5,6,7]],"TL":["670","00","7\\d{7}|(?:[2-47]\\d|[89]0)\\d{5}",[7,8],[["(\\d{3})(\\d{4})","$1 $2",["[2-489]|70"]],["(\\d{4})(\\d{4})","$1 $2",["7"]]]],"TM":["993","810","[1-6]\\d{7}",[8],[["(\\d{2})(\\d{2})(\\d{2})(\\d{2})","$1 $2-$3-$4",["12"],"(8 $1)"],["(\\d{3})(\\d)(\\d{2})(\\d{2})","$1 $2-$3-$4",["[1-5]"],"(8 $1)"],["(\\d{2})(\\d{6})","$1 $2",["6"],"8 $1"]],"8",0,0,0,0,0,0,"8~10"],"TN":["216","00","[2-57-9]\\d{7}",[8],[["(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3",["[2-57-9]"]]]],"TO":["676","00","(?:0800|(?:[5-8]\\d\\d|999)\\d)\\d{3}|[2-8]\\d{4}",[5,7],[["(\\d{2})(\\d{3})","$1-$2",["[2-4]|50|6[09]|7[0-24-69]|8[05]"]],["(\\d{4})(\\d{3})","$1 $2",["0"]],["(\\d{3})(\\d{4})","$1 $2",["[5-9]"]]]],"TR":["90","00","4\\d{6}|8\\d{11,12}|(?:[2-58]\\d\\d|900)\\d{7}",[7,10,12,13],[["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["512|8[01589]|90"],"0$1",1],["(\\d{3})(\\d{3})(\\d{2})(\\d{2})","$1 $2 $3 $4",["5(?:[0-59]|61)","5(?:[0-59]|616)","5(?:[0-59]|6161)"],"0$1",1],["(\\d{3})(\\d{3})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[24][1-8]|3[1-9]"],"(0$1)",1],["(\\d{3})(\\d{3})(\\d{6,7})","$1 $2 $3",["80"],"0$1",1]],"0"],"TT":["1","011","(?:[58]\\d\\d|900)\\d{7}",[10],0,"1",0,"1|([2-46-8]\\d{6})$","868$1",0,"868"],"TV":["688","00","(?:2|7\\d\\d|90)\\d{4}",[5,6,7],[["(\\d{2})(\\d{3})","$1 $2",["2"]],["(\\d{2})(\\d{4})","$1 $2",["90"]],["(\\d{2})(\\d{5})","$1 $2",["7"]]]],"TW":["886","0(?:0[25-79]|19)","[2-689]\\d{8}|7\\d{9,10}|[2-8]\\d{7}|2\\d{6}",[7,8,9,10,11],[["(\\d{2})(\\d)(\\d{4})","$1 $2 $3",["202"],"0$1"],["(\\d{2})(\\d{3})(\\d{3,4})","$1 $2 $3",["[258]0"],"0$1"],["(\\d)(\\d{3,4})(\\d{4})","$1 $2 $3",["[23568]|4(?:0[02-48]|[1-47-9])|7[1-9]","[23568]|4(?:0[2-48]|[1-47-9])|(?:400|7)[1-9]"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[49]"],"0$1"],["(\\d{2})(\\d{4})(\\d{4,5})","$1 $2 $3",["7"],"0$1"]],"0",0,0,0,0,0,0,0,"#"],"TZ":["255","00[056]","(?:[26-8]\\d|41|90)\\d{7}",[9],[["(\\d{3})(\\d{2})(\\d{4})","$1 $2 $3",["[89]"],"0$1"],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["[24]"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[67]"],"0$1"]],"0"],"UA":["380","00","[89]\\d{9}|[3-9]\\d{8}",[9,10],[["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["6[12][29]|(?:3[1-8]|4[136-8]|5[12457]|6[49])2|(?:56|65)[24]","6[12][29]|(?:35|4[1378]|5[12457]|6[49])2|(?:56|65)[24]|(?:3[1-46-8]|46)2[013-9]"],"0$1"],["(\\d{4})(\\d{5})","$1 $2",["3[1-8]|4(?:[1367]|[45][6-9]|8[4-6])|5(?:[1-5]|6[0135689]|7[4-6])|6(?:[12][3-7]|[459])","3[1-8]|4(?:[1367]|[45][6-9]|8[4-6])|5(?:[1-5]|6(?:[015689]|3[02389])|7[4-6])|6(?:[12][3-7]|[459])"],"0$1"],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["[3-7]|89|9[1-9]"],"0$1"],["(\\d{3})(\\d{3})(\\d{3,4})","$1 $2 $3",["[89]"],"0$1"]],"0",0,0,0,0,0,0,"0~0"],"UG":["256","00[057]","800\\d{6}|(?:[29]0|[347]\\d)\\d{7}",[9],[["(\\d{4})(\\d{5})","$1 $2",["202","2024"],"0$1"],["(\\d{3})(\\d{6})","$1 $2",["[27-9]|4(?:6[45]|[7-9])"],"0$1"],["(\\d{2})(\\d{7})","$1 $2",["[34]"],"0$1"]],"0"],"US":["1","011","[2-9]\\d{9}|3\\d{6}",[10],[["(\\d{3})(\\d{4})","$1-$2",["310"],0,1],["(\\d{3})(\\d{3})(\\d{4})","($1) $2-$3",["[2-9]"],0,1,"$1-$2-$3"]],"1",0,0,0,0,0,[["5(?:05(?:[2-57-9]\\d\\d|6(?:[0-35-9]\\d|44))|82(?:2(?:0[0-3]|[268]2)|3(?:0[02]|22|33)|4(?:00|4[24]|65|82)|5(?:00|29|58|83)|6(?:00|66|82)|7(?:58|77)|8(?:00|42|88)|9(?:00|9[89])))\\d{4}|(?:2(?:0[1-35-9]|1[02-9]|2[03-589]|3[149]|4[08]|5[1-46]|6[0279]|7[0269]|8[13])|3(?:0[1-57-9]|1[02-9]|2[01356]|3[0-24679]|4[167]|5[12]|6[014]|8[056])|4(?:0[124-9]|1[02-579]|2[3-5]|3[0245]|4[023578]|58|6[349]|7[0589]|8[04])|5(?:0[1-47-9]|1[0235-8]|20|3[0149]|4[01]|5[19]|6[1-47]|7[0-5]|8[056])|6(?:0[1-35-9]|1[024-9]|2[03689]|[34][016]|5[01679]|6[0-279]|78|8[0-29])|7(?:0[1-46-8]|1[2-9]|2[04-7]|3[1247]|4[037]|5[47]|6[02359]|7[0-59]|8[156])|8(?:0[1-68]|1[02-8]|2[068]|3[0-289]|4[03578]|5[046-9]|6[02-5]|7[028])|9(?:0[1346-9]|1[02-9]|2[0589]|3[0146-8]|4[0157-9]|5[12469]|7[0-389]|8[04-69]))[2-9]\\d{6}"],[""],["8(?:00|33|44|55|66|77|88)[2-9]\\d{6}"],["900[2-9]\\d{6}"],["52(?:3(?:[2-46-9][02-9]\\d|5(?:[02-46-9]\\d|5[0-46-9]))|4(?:[2-478][02-9]\\d|5(?:[034]\\d|2[024-9]|5[0-46-9])|6(?:0[1-9]|[2-9]\\d)|9(?:[05-9]\\d|2[0-5]|49)))\\d{4}|52[34][2-9]1[02-9]\\d{4}|5(?:00|2[125-7]|33|44|66|77|88)[2-9]\\d{6}"]]],"UY":["598","0(?:0|1[3-9]\\d)","4\\d{9}|[1249]\\d{7}|(?:[49]\\d|80)\\d{5}",[7,8,10],[["(\\d{3})(\\d{4})","$1 $2",["405|8|90"],"0$1"],["(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3",["9"],"0$1"],["(\\d{4})(\\d{4})","$1 $2",["[124]"]],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["4"],"0$1"]],"0",0,0,0,0,0,0,"00"," int. "],"UZ":["998","810","(?:33|55|[679]\\d|88)\\d{7}",[9],[["(\\d{2})(\\d{3})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[35-9]"],"8 $1"]],"8",0,0,0,0,0,0,"8~10"],"VA":["39","00","0\\d{5,10}|3[0-8]\\d{7,10}|55\\d{8}|8\\d{5}(?:\\d{2,4})?|(?:1\\d|39)\\d{7,8}",[6,7,8,9,10,11],0,0,0,0,0,0,"06698"],"VC":["1","011","(?:[58]\\d\\d|784|900)\\d{7}",[10],0,"1",0,"1|([2-7]\\d{6})$","784$1",0,"784"],"VE":["58","00","[68]00\\d{7}|(?:[24]\\d|[59]0)\\d{8}",[10],[["(\\d{3})(\\d{7})","$1-$2",["[24-689]"],"0$1"]],"0"],"VG":["1","011","(?:284|[58]\\d\\d|900)\\d{7}",[10],0,"1",0,"1|([2-578]\\d{6})$","284$1",0,"284"],"VI":["1","011","[58]\\d{9}|(?:34|90)0\\d{7}",[10],0,"1",0,"1|([2-9]\\d{6})$","340$1",0,"340"],"VN":["84","00","[12]\\d{9}|[135-9]\\d{8}|[16]\\d{7}|[16-8]\\d{6}",[7,8,9,10],[["(\\d{2})(\\d{5})","$1 $2",["80"],"0$1",1],["(\\d{4})(\\d{4,6})","$1 $2",["1"],0,1],["(\\d{2})(\\d{3})(\\d{2})(\\d{2})","$1 $2 $3 $4",["[69]"],"0$1",1],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[3578]"],"0$1",1],["(\\d{2})(\\d{4})(\\d{4})","$1 $2 $3",["2[48]"],"0$1",1],["(\\d{3})(\\d{4})(\\d{3})","$1 $2 $3",["2"],"0$1",1]],"0"],"VU":["678","00","[57-9]\\d{6}|(?:[238]\\d|48)\\d{3}",[5,7],[["(\\d{3})(\\d{4})","$1 $2",["[57-9]"]]]],"WF":["681","00","(?:40|72)\\d{4}|8\\d{5}(?:\\d{3})?",[6,9],[["(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3",["[478]"]],["(\\d{3})(\\d{2})(\\d{2})(\\d{2})","$1 $2 $3 $4",["8"]]]],"WS":["685","0","(?:[2-6]|8\\d{5})\\d{4}|[78]\\d{6}|[68]\\d{5}",[5,6,7,10],[["(\\d{5})","$1",["[2-5]|6[1-9]"]],["(\\d{3})(\\d{3,7})","$1 $2",["[68]"]],["(\\d{2})(\\d{5})","$1 $2",["7"]]]],"XK":["383","00","[23]\\d{7,8}|(?:4\\d\\d|[89]00)\\d{5}",[8,9],[["(\\d{3})(\\d{5})","$1 $2",["[89]"],"0$1"],["(\\d{2})(\\d{3})(\\d{3})","$1 $2 $3",["[2-4]"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[23]"],"0$1"]],"0"],"YE":["967","00","(?:1|7\\d)\\d{7}|[1-7]\\d{6}",[7,8,9],[["(\\d)(\\d{3})(\\d{3,4})","$1 $2 $3",["[1-6]|7[24-68]"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["7"],"0$1"]],"0"],"YT":["262","00","80\\d{7}|(?:26|63)9\\d{6}",[9],0,"0",0,0,0,0,"269|63"],"ZA":["27","00","[1-79]\\d{8}|8\\d{4,9}",[5,6,7,8,9,10],[["(\\d{2})(\\d{3,4})","$1 $2",["8[1-4]"],"0$1"],["(\\d{2})(\\d{3})(\\d{2,3})","$1 $2 $3",["8[1-4]"],"0$1"],["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["860"],"0$1"],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["[1-9]"],"0$1"],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["8"],"0$1"]],"0"],"ZM":["260","00","800\\d{6}|(?:21|63|[79]\\d)\\d{7}",[9],[["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[28]"],"0$1"],["(\\d{2})(\\d{7})","$1 $2",["[79]"],"0$1"]],"0"],"ZW":["263","00","2(?:[0-57-9]\\d{6,8}|6[0-24-9]\\d{6,7})|[38]\\d{9}|[35-8]\\d{8}|[3-6]\\d{7}|[1-689]\\d{6}|[1-3569]\\d{5}|[1356]\\d{4}",[5,6,7,8,9,10],[["(\\d{3})(\\d{3,5})","$1 $2",["2(?:0[45]|2[278]|[49]8)|3(?:[09]8|17)|6(?:[29]8|37|75)|[23][78]|(?:33|5[15]|6[68])[78]"],"0$1"],["(\\d)(\\d{3})(\\d{2,4})","$1 $2 $3",["[49]"],"0$1"],["(\\d{3})(\\d{4})","$1 $2",["80"],"0$1"],["(\\d{2})(\\d{7})","$1 $2",["24|8[13-59]|(?:2[05-79]|39|5[45]|6[15-8])2","2(?:02[014]|4|[56]20|[79]2)|392|5(?:42|525)|6(?:[16-8]21|52[013])|8[13-59]"],"(0$1)"],["(\\d{2})(\\d{3})(\\d{4})","$1 $2 $3",["7"],"0$1"],["(\\d{3})(\\d{3})(\\d{3,4})","$1 $2 $3",["2(?:1[39]|2[0157]|[378]|[56][14])|3(?:12|29)","2(?:1[39]|2[0157]|[378]|[56][14])|3(?:123|29)"],"0$1"],["(\\d{4})(\\d{6})","$1 $2",["8"],"0$1"],["(\\d{2})(\\d{3,5})","$1 $2",["1|2(?:0[0-36-9]|12|29|[56])|3(?:1[0-689]|[24-6])|5(?:[0236-9]|1[2-4])|6(?:[013-59]|7[0-46-9])|(?:33|55|6[68])[0-69]|(?:29|3[09]|62)[0-79]"],"0$1"],["(\\d{2})(\\d{3})(\\d{3,4})","$1 $2 $3",["29[013-9]|39|54"],"0$1"],["(\\d{4})(\\d{3,5})","$1 $2",["(?:25|54)8","258|5483"],"0$1"]],"0"]},"nonGeographic":{"800":["800",0,"(?:005|[1-9]\\d\\d)\\d{5}",[8],[["(\\d{4})(\\d{4})","$1 $2",["\\d"]]],0,0,0,0,0,0,[0,0,["(?:005|[1-9]\\d\\d)\\d{5}"]]],"808":["808",0,"[1-9]\\d{7}",[8],[["(\\d{4})(\\d{4})","$1 $2",["[1-9]"]]],0,0,0,0,0,0,[0,0,0,0,0,0,0,0,0,["[1-9]\\d{7}"]]],"870":["870",0,"7\\d{11}|[35-7]\\d{8}",[9,12],[["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["[35-7]"]]],0,0,0,0,0,0,[0,["(?:[356]|774[45])\\d{8}|7[6-8]\\d{7}"]]],"878":["878",0,"10\\d{10}",[12],[["(\\d{2})(\\d{5})(\\d{5})","$1 $2 $3",["1"]]],0,0,0,0,0,0,[0,0,0,0,0,0,0,0,["10\\d{10}"]]],"881":["881",0,"[0-36-9]\\d{8}",[9],[["(\\d)(\\d{3})(\\d{5})","$1 $2 $3",["[0-36-9]"]]],0,0,0,0,0,0,[0,["[0-36-9]\\d{8}"]]],"882":["882",0,"[13]\\d{6}(?:\\d{2,5})?|285\\d{9}|(?:[19]\\d|49)\\d{6}",[7,8,9,10,11,12],[["(\\d{2})(\\d{5})","$1 $2",["16|342"]],["(\\d{2})(\\d{6})","$1 $2",["4"]],["(\\d{2})(\\d{2})(\\d{4})","$1 $2 $3",["[19]"]],["(\\d{2})(\\d{4})(\\d{3})","$1 $2 $3",["3[23]"]],["(\\d{2})(\\d{3,4})(\\d{4})","$1 $2 $3",["1"]],["(\\d{2})(\\d{4})(\\d{4})","$1 $2 $3",["34[57]"]],["(\\d{3})(\\d{4})(\\d{4})","$1 $2 $3",["34"]],["(\\d{2})(\\d{4,5})(\\d{5})","$1 $2 $3",["[1-3]"]]],0,0,0,0,0,0,[0,["342\\d{4}|(?:337|49)\\d{6}|3(?:2|47|7\\d{3})\\d{7}",[7,8,9,10,12]],0,0,0,0,0,0,["1(?:3(?:0[0347]|[13][0139]|2[035]|4[013568]|6[0459]|7[06]|8[15-8]|9[0689])\\d{4}|6\\d{5,10})|(?:(?:285\\d\\d|3(?:45|[69]\\d{3}))\\d|9[89])\\d{6}"]]],"883":["883",0,"(?:210|370\\d\\d)\\d{7}|51\\d{7}(?:\\d{3})?",[9,10,12],[["(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3",["510"]],["(\\d{3})(\\d{3})(\\d{4})","$1 $2 $3",["2"]],["(\\d{4})(\\d{4})(\\d{4})","$1 $2 $3",["51[13]"]],["(\\d{3})(\\d{3})(\\d{3})(\\d{3})","$1 $2 $3 $4",["[35]"]]],0,0,0,0,0,0,[0,0,0,0,0,0,0,0,["(?:210|(?:370[1-9]|51[013]0)\\d)\\d{7}|5100\\d{5}"]]],"888":["888",0,"\\d{11}",[11],[["(\\d{3})(\\d{3})(\\d{5})","$1 $2 $3"]],0,0,0,0,0,0,[0,0,0,0,0,0,["\\d{11}"]]],"979":["979",0,"[1359]\\d{8}",[9],[["(\\d)(\\d{4})(\\d{4})","$1 $2 $3",["[1359]"]]],0,0,0,0,0,0,[0,0,0,["[1359]\\d{8}"]]]}};

    // Importing from a ".js" file is a workaround for Node.js "ES Modules"

    function withMetadataArgument(func, _arguments) {
    	var args = Array.prototype.slice.call(_arguments);
    	args.push(metadata);
    	return func.apply(this, args)
    }

    function _typeof$4(obj) { "@babel/helpers - typeof"; return _typeof$4 = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof$4(obj); }

    function _defineProperties$b(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

    function _createClass$b(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties$b(Constructor.prototype, protoProps); if (staticProps) _defineProperties$b(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

    function _classCallCheck$b(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function"); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, writable: true, configurable: true } }); Object.defineProperty(subClass, "prototype", { writable: false }); if (superClass) _setPrototypeOf(subClass, superClass); }

    function _createSuper(Derived) { var hasNativeReflectConstruct = _isNativeReflectConstruct(); return function _createSuperInternal() { var Super = _getPrototypeOf(Derived), result; if (hasNativeReflectConstruct) { var NewTarget = _getPrototypeOf(this).constructor; result = Reflect.construct(Super, arguments, NewTarget); } else { result = Super.apply(this, arguments); } return _possibleConstructorReturn(this, result); }; }

    function _possibleConstructorReturn(self, call) { if (call && (_typeof$4(call) === "object" || typeof call === "function")) { return call; } else if (call !== void 0) { throw new TypeError("Derived constructors may only return object or undefined"); } return _assertThisInitialized(self); }

    function _assertThisInitialized(self) { if (self === void 0) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return self; }

    function _wrapNativeSuper(Class) { var _cache = typeof Map === "function" ? new Map() : undefined; _wrapNativeSuper = function _wrapNativeSuper(Class) { if (Class === null || !_isNativeFunction(Class)) return Class; if (typeof Class !== "function") { throw new TypeError("Super expression must either be null or a function"); } if (typeof _cache !== "undefined") { if (_cache.has(Class)) return _cache.get(Class); _cache.set(Class, Wrapper); } function Wrapper() { return _construct(Class, arguments, _getPrototypeOf(this).constructor); } Wrapper.prototype = Object.create(Class.prototype, { constructor: { value: Wrapper, enumerable: false, writable: true, configurable: true } }); return _setPrototypeOf(Wrapper, Class); }; return _wrapNativeSuper(Class); }

    function _construct(Parent, args, Class) { if (_isNativeReflectConstruct()) { _construct = Reflect.construct; } else { _construct = function _construct(Parent, args, Class) { var a = [null]; a.push.apply(a, args); var Constructor = Function.bind.apply(Parent, a); var instance = new Constructor(); if (Class) _setPrototypeOf(instance, Class.prototype); return instance; }; } return _construct.apply(null, arguments); }

    function _isNativeReflectConstruct() { if (typeof Reflect === "undefined" || !Reflect.construct) return false; if (Reflect.construct.sham) return false; if (typeof Proxy === "function") return true; try { Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function () {})); return true; } catch (e) { return false; } }

    function _isNativeFunction(fn) { return Function.toString.call(fn).indexOf("[native code]") !== -1; }

    function _setPrototypeOf(o, p) { _setPrototypeOf = Object.setPrototypeOf || function _setPrototypeOf(o, p) { o.__proto__ = p; return o; }; return _setPrototypeOf(o, p); }

    function _getPrototypeOf(o) { _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf : function _getPrototypeOf(o) { return o.__proto__ || Object.getPrototypeOf(o); }; return _getPrototypeOf(o); }

    // https://stackoverflow.com/a/46971044/970769
    // "Breaking changes in Typescript 2.1"
    // "Extending built-ins like Error, Array, and Map may no longer work."
    // "As a recommendation, you can manually adjust the prototype immediately after any super(...) calls."
    // https://github.com/Microsoft/TypeScript-wiki/blob/main/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
    var ParseError = /*#__PURE__*/function (_Error) {
      _inherits(ParseError, _Error);

      var _super = _createSuper(ParseError);

      function ParseError(code) {
        var _this;

        _classCallCheck$b(this, ParseError);

        _this = _super.call(this, code); // Set the prototype explicitly.
        // Any subclass of FooError will have to manually set the prototype as well.

        Object.setPrototypeOf(_assertThisInitialized(_this), ParseError.prototype);
        _this.name = _this.constructor.name;
        return _this;
      }

      return _createClass$b(ParseError);
    }( /*#__PURE__*/_wrapNativeSuper(Error));

    // The minimum length of the national significant number.
    var MIN_LENGTH_FOR_NSN = 2; // The ITU says the maximum length should be 15,
    // but one can find longer numbers in Germany.

    var MAX_LENGTH_FOR_NSN = 17; // The maximum length of the country calling code.

    var MAX_LENGTH_COUNTRY_CODE = 3; // Digits accepted in phone numbers
    // (ascii, fullwidth, arabic-indic, and eastern arabic digits).

    var VALID_DIGITS = "0-9\uFF10-\uFF19\u0660-\u0669\u06F0-\u06F9"; // `DASHES` will be right after the opening square bracket of the "character class"

    var DASHES = "-\u2010-\u2015\u2212\u30FC\uFF0D";
    var SLASHES = "\uFF0F/";
    var DOTS = "\uFF0E.";
    var WHITESPACE = " \xA0\xAD\u200B\u2060\u3000";
    var BRACKETS = "()\uFF08\uFF09\uFF3B\uFF3D\\[\\]"; // export const OPENING_BRACKETS = '(\uFF08\uFF3B\\\['

    var TILDES = "~\u2053\u223C\uFF5E"; // Regular expression of acceptable punctuation found in phone numbers. This
    // excludes punctuation found as a leading character only. This consists of dash
    // characters, white space characters, full stops, slashes, square brackets,
    // parentheses and tildes. Full-width variants are also present.

    var VALID_PUNCTUATION = "".concat(DASHES).concat(SLASHES).concat(DOTS).concat(WHITESPACE).concat(BRACKETS).concat(TILDES);
    var PLUS_CHARS = "+\uFF0B"; // const LEADING_PLUS_CHARS_PATTERN = new RegExp('^[' + PLUS_CHARS + ']+')

    // Copy-pasted from:
    // https://github.com/substack/semver-compare/blob/master/index.js
    //
    // Inlining this function because some users reported issues with
    // importing from `semver-compare` in a browser with ES6 "native" modules.
    //
    // Fixes `semver-compare` not being able to compare versions with alpha/beta/etc "tags".
    // https://github.com/catamphetamine/libphonenumber-js/issues/381
    function compare (a, b) {
      a = a.split('-');
      b = b.split('-');
      var pa = a[0].split('.');
      var pb = b[0].split('.');

      for (var i = 0; i < 3; i++) {
        var na = Number(pa[i]);
        var nb = Number(pb[i]);
        if (na > nb) return 1;
        if (nb > na) return -1;
        if (!isNaN(na) && isNaN(nb)) return 1;
        if (isNaN(na) && !isNaN(nb)) return -1;
      }

      if (a[1] && b[1]) {
        return a[1] > b[1] ? 1 : a[1] < b[1] ? -1 : 0;
      }

      return !a[1] && b[1] ? 1 : a[1] && !b[1] ? -1 : 0;
    }

    function _typeof$3(obj) { "@babel/helpers - typeof"; return _typeof$3 = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof$3(obj); }

    function _classCallCheck$a(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _defineProperties$a(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

    function _createClass$a(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties$a(Constructor.prototype, protoProps); if (staticProps) _defineProperties$a(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

    var V3 = '1.2.0'; // Moved `001` country code to "nonGeographic" section of metadata.

    var V4 = '1.7.35';
    var DEFAULT_EXT_PREFIX = ' ext. ';
    var CALLING_CODE_REG_EXP = /^\d+$/;
    /**
     * See: https://gitlab.com/catamphetamine/libphonenumber-js/blob/master/METADATA.md
     */

    var Metadata = /*#__PURE__*/function () {
      function Metadata(metadata) {
        _classCallCheck$a(this, Metadata);

        validateMetadata(metadata);
        this.metadata = metadata;
        setVersion.call(this, metadata);
      }

      _createClass$a(Metadata, [{
        key: "getCountries",
        value: function getCountries() {
          return Object.keys(this.metadata.countries).filter(function (_) {
            return _ !== '001';
          });
        }
      }, {
        key: "getCountryMetadata",
        value: function getCountryMetadata(countryCode) {
          return this.metadata.countries[countryCode];
        }
      }, {
        key: "nonGeographic",
        value: function nonGeographic() {
          if (this.v1 || this.v2 || this.v3) return; // `nonGeographical` was a typo.
          // It's present in metadata generated from `1.7.35` to `1.7.37`.
          // The test case could be found by searching for "nonGeographical".

          return this.metadata.nonGeographic || this.metadata.nonGeographical;
        }
      }, {
        key: "hasCountry",
        value: function hasCountry(country) {
          return this.getCountryMetadata(country) !== undefined;
        }
      }, {
        key: "hasCallingCode",
        value: function hasCallingCode(callingCode) {
          if (this.getCountryCodesForCallingCode(callingCode)) {
            return true;
          }

          if (this.nonGeographic()) {
            if (this.nonGeographic()[callingCode]) {
              return true;
            }
          } else {
            // A hacky workaround for old custom metadata (generated before V4).
            var countryCodes = this.countryCallingCodes()[callingCode];

            if (countryCodes && countryCodes.length === 1 && countryCodes[0] === '001') {
              return true;
            }
          }
        }
      }, {
        key: "isNonGeographicCallingCode",
        value: function isNonGeographicCallingCode(callingCode) {
          if (this.nonGeographic()) {
            return this.nonGeographic()[callingCode] ? true : false;
          } else {
            return this.getCountryCodesForCallingCode(callingCode) ? false : true;
          }
        } // Deprecated.

      }, {
        key: "country",
        value: function country(countryCode) {
          return this.selectNumberingPlan(countryCode);
        }
      }, {
        key: "selectNumberingPlan",
        value: function selectNumberingPlan(countryCode, callingCode) {
          // Supports just passing `callingCode` as the first argument.
          if (countryCode && CALLING_CODE_REG_EXP.test(countryCode)) {
            callingCode = countryCode;
            countryCode = null;
          }

          if (countryCode && countryCode !== '001') {
            if (!this.hasCountry(countryCode)) {
              throw new Error("Unknown country: ".concat(countryCode));
            }

            this.numberingPlan = new NumberingPlan(this.getCountryMetadata(countryCode), this);
          } else if (callingCode) {
            if (!this.hasCallingCode(callingCode)) {
              throw new Error("Unknown calling code: ".concat(callingCode));
            }

            this.numberingPlan = new NumberingPlan(this.getNumberingPlanMetadata(callingCode), this);
          } else {
            this.numberingPlan = undefined;
          }

          return this;
        }
      }, {
        key: "getCountryCodesForCallingCode",
        value: function getCountryCodesForCallingCode(callingCode) {
          var countryCodes = this.countryCallingCodes()[callingCode];

          if (countryCodes) {
            // Metadata before V4 included "non-geographic entity" calling codes
            // inside `country_calling_codes` (for example, `"881":["001"]`).
            // Now the semantics of `country_calling_codes` has changed:
            // it's specifically for "countries" now.
            // Older versions of custom metadata will simply skip parsing
            // "non-geographic entity" phone numbers with new versions
            // of this library: it's not considered a bug,
            // because such numbers are extremely rare,
            // and developers extremely rarely use custom metadata.
            if (countryCodes.length === 1 && countryCodes[0].length === 3) {
              return;
            }

            return countryCodes;
          }
        }
      }, {
        key: "getCountryCodeForCallingCode",
        value: function getCountryCodeForCallingCode(callingCode) {
          var countryCodes = this.getCountryCodesForCallingCode(callingCode);

          if (countryCodes) {
            return countryCodes[0];
          }
        }
      }, {
        key: "getNumberingPlanMetadata",
        value: function getNumberingPlanMetadata(callingCode) {
          var countryCode = this.getCountryCodeForCallingCode(callingCode);

          if (countryCode) {
            return this.getCountryMetadata(countryCode);
          }

          if (this.nonGeographic()) {
            var metadata = this.nonGeographic()[callingCode];

            if (metadata) {
              return metadata;
            }
          } else {
            // A hacky workaround for old custom metadata (generated before V4).
            // In that metadata, there was no concept of "non-geographic" metadata
            // so metadata for `001` country code was stored along with other countries.
            // The test case can be found by searching for:
            // "should work around `nonGeographic` metadata not existing".
            var countryCodes = this.countryCallingCodes()[callingCode];

            if (countryCodes && countryCodes.length === 1 && countryCodes[0] === '001') {
              return this.metadata.countries['001'];
            }
          }
        } // Deprecated.

      }, {
        key: "countryCallingCode",
        value: function countryCallingCode() {
          return this.numberingPlan.callingCode();
        } // Deprecated.

      }, {
        key: "IDDPrefix",
        value: function IDDPrefix() {
          return this.numberingPlan.IDDPrefix();
        } // Deprecated.

      }, {
        key: "defaultIDDPrefix",
        value: function defaultIDDPrefix() {
          return this.numberingPlan.defaultIDDPrefix();
        } // Deprecated.

      }, {
        key: "nationalNumberPattern",
        value: function nationalNumberPattern() {
          return this.numberingPlan.nationalNumberPattern();
        } // Deprecated.

      }, {
        key: "possibleLengths",
        value: function possibleLengths() {
          return this.numberingPlan.possibleLengths();
        } // Deprecated.

      }, {
        key: "formats",
        value: function formats() {
          return this.numberingPlan.formats();
        } // Deprecated.

      }, {
        key: "nationalPrefixForParsing",
        value: function nationalPrefixForParsing() {
          return this.numberingPlan.nationalPrefixForParsing();
        } // Deprecated.

      }, {
        key: "nationalPrefixTransformRule",
        value: function nationalPrefixTransformRule() {
          return this.numberingPlan.nationalPrefixTransformRule();
        } // Deprecated.

      }, {
        key: "leadingDigits",
        value: function leadingDigits() {
          return this.numberingPlan.leadingDigits();
        } // Deprecated.

      }, {
        key: "hasTypes",
        value: function hasTypes() {
          return this.numberingPlan.hasTypes();
        } // Deprecated.

      }, {
        key: "type",
        value: function type(_type) {
          return this.numberingPlan.type(_type);
        } // Deprecated.

      }, {
        key: "ext",
        value: function ext() {
          return this.numberingPlan.ext();
        }
      }, {
        key: "countryCallingCodes",
        value: function countryCallingCodes() {
          if (this.v1) return this.metadata.country_phone_code_to_countries;
          return this.metadata.country_calling_codes;
        } // Deprecated.

      }, {
        key: "chooseCountryByCountryCallingCode",
        value: function chooseCountryByCountryCallingCode(callingCode) {
          return this.selectNumberingPlan(callingCode);
        }
      }, {
        key: "hasSelectedNumberingPlan",
        value: function hasSelectedNumberingPlan() {
          return this.numberingPlan !== undefined;
        }
      }]);

      return Metadata;
    }();

    var NumberingPlan = /*#__PURE__*/function () {
      function NumberingPlan(metadata, globalMetadataObject) {
        _classCallCheck$a(this, NumberingPlan);

        this.globalMetadataObject = globalMetadataObject;
        this.metadata = metadata;
        setVersion.call(this, globalMetadataObject.metadata);
      }

      _createClass$a(NumberingPlan, [{
        key: "callingCode",
        value: function callingCode() {
          return this.metadata[0];
        } // Formatting information for regions which share
        // a country calling code is contained by only one region
        // for performance reasons. For example, for NANPA region
        // ("North American Numbering Plan Administration",
        //  which includes USA, Canada, Cayman Islands, Bahamas, etc)
        // it will be contained in the metadata for `US`.

      }, {
        key: "getDefaultCountryMetadataForRegion",
        value: function getDefaultCountryMetadataForRegion() {
          return this.globalMetadataObject.getNumberingPlanMetadata(this.callingCode());
        } // Is always present.

      }, {
        key: "IDDPrefix",
        value: function IDDPrefix() {
          if (this.v1 || this.v2) return;
          return this.metadata[1];
        } // Is only present when a country supports multiple IDD prefixes.

      }, {
        key: "defaultIDDPrefix",
        value: function defaultIDDPrefix() {
          if (this.v1 || this.v2) return;
          return this.metadata[12];
        }
      }, {
        key: "nationalNumberPattern",
        value: function nationalNumberPattern() {
          if (this.v1 || this.v2) return this.metadata[1];
          return this.metadata[2];
        } // "possible length" data is always present in Google's metadata.

      }, {
        key: "possibleLengths",
        value: function possibleLengths() {
          if (this.v1) return;
          return this.metadata[this.v2 ? 2 : 3];
        }
      }, {
        key: "_getFormats",
        value: function _getFormats(metadata) {
          return metadata[this.v1 ? 2 : this.v2 ? 3 : 4];
        } // For countries of the same region (e.g. NANPA)
        // formats are all stored in the "main" country for that region.
        // E.g. "RU" and "KZ", "US" and "CA".

      }, {
        key: "formats",
        value: function formats() {
          var _this = this;

          var formats = this._getFormats(this.metadata) || this._getFormats(this.getDefaultCountryMetadataForRegion()) || [];
          return formats.map(function (_) {
            return new Format(_, _this);
          });
        }
      }, {
        key: "nationalPrefix",
        value: function nationalPrefix() {
          return this.metadata[this.v1 ? 3 : this.v2 ? 4 : 5];
        }
      }, {
        key: "_getNationalPrefixFormattingRule",
        value: function _getNationalPrefixFormattingRule(metadata) {
          return metadata[this.v1 ? 4 : this.v2 ? 5 : 6];
        } // For countries of the same region (e.g. NANPA)
        // national prefix formatting rule is stored in the "main" country for that region.
        // E.g. "RU" and "KZ", "US" and "CA".

      }, {
        key: "nationalPrefixFormattingRule",
        value: function nationalPrefixFormattingRule() {
          return this._getNationalPrefixFormattingRule(this.metadata) || this._getNationalPrefixFormattingRule(this.getDefaultCountryMetadataForRegion());
        }
      }, {
        key: "_nationalPrefixForParsing",
        value: function _nationalPrefixForParsing() {
          return this.metadata[this.v1 ? 5 : this.v2 ? 6 : 7];
        }
      }, {
        key: "nationalPrefixForParsing",
        value: function nationalPrefixForParsing() {
          // If `national_prefix_for_parsing` is not set explicitly,
          // then infer it from `national_prefix` (if any)
          return this._nationalPrefixForParsing() || this.nationalPrefix();
        }
      }, {
        key: "nationalPrefixTransformRule",
        value: function nationalPrefixTransformRule() {
          return this.metadata[this.v1 ? 6 : this.v2 ? 7 : 8];
        }
      }, {
        key: "_getNationalPrefixIsOptionalWhenFormatting",
        value: function _getNationalPrefixIsOptionalWhenFormatting() {
          return !!this.metadata[this.v1 ? 7 : this.v2 ? 8 : 9];
        } // For countries of the same region (e.g. NANPA)
        // "national prefix is optional when formatting" flag is
        // stored in the "main" country for that region.
        // E.g. "RU" and "KZ", "US" and "CA".

      }, {
        key: "nationalPrefixIsOptionalWhenFormattingInNationalFormat",
        value: function nationalPrefixIsOptionalWhenFormattingInNationalFormat() {
          return this._getNationalPrefixIsOptionalWhenFormatting(this.metadata) || this._getNationalPrefixIsOptionalWhenFormatting(this.getDefaultCountryMetadataForRegion());
        }
      }, {
        key: "leadingDigits",
        value: function leadingDigits() {
          return this.metadata[this.v1 ? 8 : this.v2 ? 9 : 10];
        }
      }, {
        key: "types",
        value: function types() {
          return this.metadata[this.v1 ? 9 : this.v2 ? 10 : 11];
        }
      }, {
        key: "hasTypes",
        value: function hasTypes() {
          // Versions 1.2.0 - 1.2.4: can be `[]`.

          /* istanbul ignore next */
          if (this.types() && this.types().length === 0) {
            return false;
          } // Versions <= 1.2.4: can be `undefined`.
          // Version >= 1.2.5: can be `0`.


          return !!this.types();
        }
      }, {
        key: "type",
        value: function type(_type2) {
          if (this.hasTypes() && getType(this.types(), _type2)) {
            return new Type(getType(this.types(), _type2), this);
          }
        }
      }, {
        key: "ext",
        value: function ext() {
          if (this.v1 || this.v2) return DEFAULT_EXT_PREFIX;
          return this.metadata[13] || DEFAULT_EXT_PREFIX;
        }
      }]);

      return NumberingPlan;
    }();

    var Format = /*#__PURE__*/function () {
      function Format(format, metadata) {
        _classCallCheck$a(this, Format);

        this._format = format;
        this.metadata = metadata;
      }

      _createClass$a(Format, [{
        key: "pattern",
        value: function pattern() {
          return this._format[0];
        }
      }, {
        key: "format",
        value: function format() {
          return this._format[1];
        }
      }, {
        key: "leadingDigitsPatterns",
        value: function leadingDigitsPatterns() {
          return this._format[2] || [];
        }
      }, {
        key: "nationalPrefixFormattingRule",
        value: function nationalPrefixFormattingRule() {
          return this._format[3] || this.metadata.nationalPrefixFormattingRule();
        }
      }, {
        key: "nationalPrefixIsOptionalWhenFormattingInNationalFormat",
        value: function nationalPrefixIsOptionalWhenFormattingInNationalFormat() {
          return !!this._format[4] || this.metadata.nationalPrefixIsOptionalWhenFormattingInNationalFormat();
        }
      }, {
        key: "nationalPrefixIsMandatoryWhenFormattingInNationalFormat",
        value: function nationalPrefixIsMandatoryWhenFormattingInNationalFormat() {
          // National prefix is omitted if there's no national prefix formatting rule
          // set for this country, or when the national prefix formatting rule
          // contains no national prefix itself, or when this rule is set but
          // national prefix is optional for this phone number format
          // (and it is not enforced explicitly)
          return this.usesNationalPrefix() && !this.nationalPrefixIsOptionalWhenFormattingInNationalFormat();
        } // Checks whether national prefix formatting rule contains national prefix.

      }, {
        key: "usesNationalPrefix",
        value: function usesNationalPrefix() {
          return this.nationalPrefixFormattingRule() && // Check that national prefix formatting rule is not a "dummy" one.
          !FIRST_GROUP_ONLY_PREFIX_PATTERN.test(this.nationalPrefixFormattingRule()) // In compressed metadata, `this.nationalPrefixFormattingRule()` is `0`
          // when `national_prefix_formatting_rule` is not present.
          // So, `true` or `false` are returned explicitly here, so that
          // `0` number isn't returned.
          ? true : false;
        }
      }, {
        key: "internationalFormat",
        value: function internationalFormat() {
          return this._format[5] || this.format();
        }
      }]);

      return Format;
    }();
    /**
     * A pattern that is used to determine if the national prefix formatting rule
     * has the first group only, i.e., does not start with the national prefix.
     * Note that the pattern explicitly allows for unbalanced parentheses.
     */


    var FIRST_GROUP_ONLY_PREFIX_PATTERN = /^\(?\$1\)?$/;

    var Type = /*#__PURE__*/function () {
      function Type(type, metadata) {
        _classCallCheck$a(this, Type);

        this.type = type;
        this.metadata = metadata;
      }

      _createClass$a(Type, [{
        key: "pattern",
        value: function pattern() {
          if (this.metadata.v1) return this.type;
          return this.type[0];
        }
      }, {
        key: "possibleLengths",
        value: function possibleLengths() {
          if (this.metadata.v1) return;
          return this.type[1] || this.metadata.possibleLengths();
        }
      }]);

      return Type;
    }();

    function getType(types, type) {
      switch (type) {
        case 'FIXED_LINE':
          return types[0];

        case 'MOBILE':
          return types[1];

        case 'TOLL_FREE':
          return types[2];

        case 'PREMIUM_RATE':
          return types[3];

        case 'PERSONAL_NUMBER':
          return types[4];

        case 'VOICEMAIL':
          return types[5];

        case 'UAN':
          return types[6];

        case 'PAGER':
          return types[7];

        case 'VOIP':
          return types[8];

        case 'SHARED_COST':
          return types[9];
      }
    }

    function validateMetadata(metadata) {
      if (!metadata) {
        throw new Error('[libphonenumber-js] `metadata` argument not passed. Check your arguments.');
      } // `country_phone_code_to_countries` was renamed to
      // `country_calling_codes` in `1.0.18`.


      if (!is_object$1(metadata) || !is_object$1(metadata.countries)) {
        throw new Error("[libphonenumber-js] `metadata` argument was passed but it's not a valid metadata. Must be an object having `.countries` child object property. Got ".concat(is_object$1(metadata) ? 'an object of shape: { ' + Object.keys(metadata).join(', ') + ' }' : 'a ' + type_of(metadata) + ': ' + metadata, "."));
      }
    } // Babel transforms `typeof` into some "branches"
    // so istanbul will show this as "branch not covered".

    /* istanbul ignore next */

    var is_object$1 = function is_object(_) {
      return _typeof$3(_) === 'object';
    }; // Babel transforms `typeof` into some "branches"
    // so istanbul will show this as "branch not covered".

    /* istanbul ignore next */


    var type_of = function type_of(_) {
      return _typeof$3(_);
    };
    /**
     * Returns "country calling code" for a country.
     * Throws an error if the country doesn't exist or isn't supported by this library.
     * @param  {string} country
     * @param  {object} metadata
     * @return {string}
     * @example
     * // Returns "44"
     * getCountryCallingCode("GB")
     */

    function getCountryCallingCode(country, metadata) {
      metadata = new Metadata(metadata);

      if (metadata.hasCountry(country)) {
        return metadata.country(country).countryCallingCode();
      }

      throw new Error("Unknown country: ".concat(country));
    }
    function isSupportedCountry(country, metadata) {
      // metadata = new Metadata(metadata)
      // return metadata.hasCountry(country)
      return metadata.countries[country] !== undefined;
    }

    function setVersion(metadata) {
      var version = metadata.version;

      if (typeof version === 'number') {
        this.v1 = version === 1;
        this.v2 = version === 2;
        this.v3 = version === 3;
        this.v4 = version === 4;
      } else {
        if (!version) {
          this.v1 = true;
        } else if (compare(version, V3) === -1) {
          this.v2 = true;
        } else if (compare(version, V4) === -1) {
          this.v3 = true;
        } else {
          this.v4 = true;
        }
      }
    } // const ISO_COUNTRY_CODE = /^[A-Z]{2}$/
    // function isCountryCode(countryCode) {
    // 	return ISO_COUNTRY_CODE.test(countryCodeOrCountryCallingCode)
    // }

    var RFC3966_EXTN_PREFIX = ';ext=';
    /**
     * Helper method for constructing regular expressions for parsing. Creates
     * an expression that captures up to max_length digits.
     * @return {string} RegEx pattern to capture extension digits.
     */

    var getExtensionDigitsPattern = function getExtensionDigitsPattern(maxLength) {
      return "([".concat(VALID_DIGITS, "]{1,").concat(maxLength, "})");
    };
    /**
     * Helper initialiser method to create the regular-expression pattern to match
     * extensions.
     * Copy-pasted from Google's `libphonenumber`:
     * https://github.com/google/libphonenumber/blob/55b2646ec9393f4d3d6661b9c82ef9e258e8b829/javascript/i18n/phonenumbers/phonenumberutil.js#L759-L766
     * @return {string} RegEx pattern to capture extensions.
     */


    function createExtensionPattern(purpose) {
      // We cap the maximum length of an extension based on the ambiguity of the way
      // the extension is prefixed. As per ITU, the officially allowed length for
      // extensions is actually 40, but we don't support this since we haven't seen real
      // examples and this introduces many false interpretations as the extension labels
      // are not standardized.

      /** @type {string} */
      var extLimitAfterExplicitLabel = '20';
      /** @type {string} */

      var extLimitAfterLikelyLabel = '15';
      /** @type {string} */

      var extLimitAfterAmbiguousChar = '9';
      /** @type {string} */

      var extLimitWhenNotSure = '6';
      /** @type {string} */

      var possibleSeparatorsBetweenNumberAndExtLabel = "[ \xA0\\t,]*"; // Optional full stop (.) or colon, followed by zero or more spaces/tabs/commas.

      /** @type {string} */

      var possibleCharsAfterExtLabel = "[:\\.\uFF0E]?[ \xA0\\t,-]*";
      /** @type {string} */

      var optionalExtnSuffix = "#?"; // Here the extension is called out in more explicit way, i.e mentioning it obvious
      // patterns like "ext.".

      /** @type {string} */

      var explicitExtLabels = "(?:e?xt(?:ensi(?:o\u0301?|\xF3))?n?|\uFF45?\uFF58\uFF54\uFF4E?|\u0434\u043E\u0431|anexo)"; // One-character symbols that can be used to indicate an extension, and less
      // commonly used or more ambiguous extension labels.

      /** @type {string} */

      var ambiguousExtLabels = "(?:[x\uFF58#\uFF03~\uFF5E]|int|\uFF49\uFF4E\uFF54)"; // When extension is not separated clearly.

      /** @type {string} */

      var ambiguousSeparator = "[- ]+"; // This is the same as possibleSeparatorsBetweenNumberAndExtLabel, but not matching
      // comma as extension label may have it.

      /** @type {string} */

      var possibleSeparatorsNumberExtLabelNoComma = "[ \xA0\\t]*"; // ",," is commonly used for auto dialling the extension when connected. First
      // comma is matched through possibleSeparatorsBetweenNumberAndExtLabel, so we do
      // not repeat it here. Semi-colon works in Iphone and Android also to pop up a
      // button with the extension number following.

      /** @type {string} */

      var autoDiallingAndExtLabelsFound = "(?:,{2}|;)";
      /** @type {string} */

      var rfcExtn = RFC3966_EXTN_PREFIX + getExtensionDigitsPattern(extLimitAfterExplicitLabel);
      /** @type {string} */

      var explicitExtn = possibleSeparatorsBetweenNumberAndExtLabel + explicitExtLabels + possibleCharsAfterExtLabel + getExtensionDigitsPattern(extLimitAfterExplicitLabel) + optionalExtnSuffix;
      /** @type {string} */

      var ambiguousExtn = possibleSeparatorsBetweenNumberAndExtLabel + ambiguousExtLabels + possibleCharsAfterExtLabel + getExtensionDigitsPattern(extLimitAfterAmbiguousChar) + optionalExtnSuffix;
      /** @type {string} */

      var americanStyleExtnWithSuffix = ambiguousSeparator + getExtensionDigitsPattern(extLimitWhenNotSure) + "#";
      /** @type {string} */

      var autoDiallingExtn = possibleSeparatorsNumberExtLabelNoComma + autoDiallingAndExtLabelsFound + possibleCharsAfterExtLabel + getExtensionDigitsPattern(extLimitAfterLikelyLabel) + optionalExtnSuffix;
      /** @type {string} */

      var onlyCommasExtn = possibleSeparatorsNumberExtLabelNoComma + "(?:,)+" + possibleCharsAfterExtLabel + getExtensionDigitsPattern(extLimitAfterAmbiguousChar) + optionalExtnSuffix; // The first regular expression covers RFC 3966 format, where the extension is added
      // using ";ext=". The second more generic where extension is mentioned with explicit
      // labels like "ext:". In both the above cases we allow more numbers in extension than
      // any other extension labels. The third one captures when single character extension
      // labels or less commonly used labels are used. In such cases we capture fewer
      // extension digits in order to reduce the chance of falsely interpreting two
      // numbers beside each other as a number + extension. The fourth one covers the
      // special case of American numbers where the extension is written with a hash
      // at the end, such as "- 503#". The fifth one is exclusively for extension
      // autodialling formats which are used when dialling and in this case we accept longer
      // extensions. The last one is more liberal on the number of commas that acts as
      // extension labels, so we have a strict cap on the number of digits in such extensions.

      return rfcExtn + "|" + explicitExtn + "|" + ambiguousExtn + "|" + americanStyleExtnWithSuffix + "|" + autoDiallingExtn + "|" + onlyCommasExtn;
    }

    //  Checks we have at least three leading digits, and only valid punctuation,
    //  alpha characters and digits in the phone number. Does not include extension
    //  data. The symbol 'x' is allowed here as valid punctuation since it is often
    //  used as a placeholder for carrier codes, for example in Brazilian phone
    //  numbers. We also allow multiple '+' characters at the start.
    //
    //  Corresponds to the following:
    //  [digits]{minLengthNsn}|
    //  plus_sign*
    //  (([punctuation]|[star])*[digits]){3,}([punctuation]|[star]|[digits]|[alpha])*
    //
    //  The first reg-ex is to allow short numbers (two digits long) to be parsed if
    //  they are entered as "15" etc, but only if there is no punctuation in them.
    //  The second expression restricts the number of digits to three or more, but
    //  then allows them to be in international form, and to have alpha-characters
    //  and punctuation. We split up the two reg-exes here and combine them when
    //  creating the reg-ex VALID_PHONE_NUMBER_PATTERN itself so we can prefix it
    //  with ^ and append $ to each branch.
    //
    //  "Note VALID_PUNCTUATION starts with a -,
    //   so must be the first in the range" (c) Google devs.
    //  (wtf did they mean by saying that; probably nothing)
    //

    var MIN_LENGTH_PHONE_NUMBER_PATTERN = '[' + VALID_DIGITS + ']{' + MIN_LENGTH_FOR_NSN + '}'; //
    // And this is the second reg-exp:
    // (see MIN_LENGTH_PHONE_NUMBER_PATTERN for a full description of this reg-exp)
    //

    var VALID_PHONE_NUMBER = '[' + PLUS_CHARS + ']{0,1}' + '(?:' + '[' + VALID_PUNCTUATION + ']*' + '[' + VALID_DIGITS + ']' + '){3,}' + '[' + VALID_PUNCTUATION + VALID_DIGITS + ']*'; // This regular expression isn't present in Google's `libphonenumber`
    // and is only used to determine whether the phone number being input
    // is too short for it to even consider it a "valid" number.
    // This is just a way to differentiate between a really invalid phone
    // number like "abcde" and a valid phone number that a user has just
    // started inputting, like "+1" or "1": both these cases would be
    // considered `NOT_A_NUMBER` by Google's `libphonenumber`, but this
    // library can provide a more detailed error message — whether it's
    // really "not a number", or is it just a start of a valid phone number.

    var VALID_PHONE_NUMBER_START_REG_EXP = new RegExp('^' + '[' + PLUS_CHARS + ']{0,1}' + '(?:' + '[' + VALID_PUNCTUATION + ']*' + '[' + VALID_DIGITS + ']' + '){1,2}' + '$', 'i');
    var VALID_PHONE_NUMBER_WITH_EXTENSION = VALID_PHONE_NUMBER + // Phone number extensions
    '(?:' + createExtensionPattern() + ')?'; // The combined regular expression for valid phone numbers:
    //

    var VALID_PHONE_NUMBER_PATTERN = new RegExp( // Either a short two-digit-only phone number
    '^' + MIN_LENGTH_PHONE_NUMBER_PATTERN + '$' + '|' + // Or a longer fully parsed phone number (min 3 characters)
    '^' + VALID_PHONE_NUMBER_WITH_EXTENSION + '$', 'i'); // Checks to see if the string of characters could possibly be a phone number at
    // all. At the moment, checks to see that the string begins with at least 2
    // digits, ignoring any punctuation commonly found in phone numbers. This method
    // does not require the number to be normalized in advance - but does assume
    // that leading non-number symbols have been removed, such as by the method
    // `extract_possible_number`.
    //

    function isViablePhoneNumber(number) {
      return number.length >= MIN_LENGTH_FOR_NSN && VALID_PHONE_NUMBER_PATTERN.test(number);
    } // This is just a way to differentiate between a really invalid phone
    // number like "abcde" and a valid phone number that a user has just
    // started inputting, like "+1" or "1": both these cases would be
    // considered `NOT_A_NUMBER` by Google's `libphonenumber`, but this
    // library can provide a more detailed error message — whether it's
    // really "not a number", or is it just a start of a valid phone number.

    function isViablePhoneNumberStart(number) {
      return VALID_PHONE_NUMBER_START_REG_EXP.test(number);
    }

    // 1 or more valid digits, for use when parsing.

    var EXTN_PATTERN = new RegExp('(?:' + createExtensionPattern() + ')$', 'i'); // Strips any extension (as in, the part of the number dialled after the call is
    // connected, usually indicated with extn, ext, x or similar) from the end of
    // the number, and returns it.

    function extractExtension(number) {
      var start = number.search(EXTN_PATTERN);

      if (start < 0) {
        return {};
      } // If we find a potential extension, and the number preceding this is a viable
      // number, we assume it is an extension.


      var numberWithoutExtension = number.slice(0, start);
      var matches = number.match(EXTN_PATTERN);
      var i = 1;

      while (i < matches.length) {
        if (matches[i]) {
          return {
            number: numberWithoutExtension,
            ext: matches[i]
          };
        }

        i++;
      }
    }

    function _createForOfIteratorHelperLoose$b(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray$e(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

    function _unsupportedIterableToArray$e(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray$e(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$e(o, minLen); }

    function _arrayLikeToArray$e(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

    // These mappings map a character (key) to a specific digit that should
    // replace it for normalization purposes. Non-European digits that
    // may be used in phone numbers are mapped to a European equivalent.
    //
    // E.g. in Iraq they don't write `+442323234` but rather `+٤٤٢٣٢٣٢٣٤`.
    //
    var DIGITS = {
      '0': '0',
      '1': '1',
      '2': '2',
      '3': '3',
      '4': '4',
      '5': '5',
      '6': '6',
      '7': '7',
      '8': '8',
      '9': '9',
      "\uFF10": '0',
      // Fullwidth digit 0
      "\uFF11": '1',
      // Fullwidth digit 1
      "\uFF12": '2',
      // Fullwidth digit 2
      "\uFF13": '3',
      // Fullwidth digit 3
      "\uFF14": '4',
      // Fullwidth digit 4
      "\uFF15": '5',
      // Fullwidth digit 5
      "\uFF16": '6',
      // Fullwidth digit 6
      "\uFF17": '7',
      // Fullwidth digit 7
      "\uFF18": '8',
      // Fullwidth digit 8
      "\uFF19": '9',
      // Fullwidth digit 9
      "\u0660": '0',
      // Arabic-indic digit 0
      "\u0661": '1',
      // Arabic-indic digit 1
      "\u0662": '2',
      // Arabic-indic digit 2
      "\u0663": '3',
      // Arabic-indic digit 3
      "\u0664": '4',
      // Arabic-indic digit 4
      "\u0665": '5',
      // Arabic-indic digit 5
      "\u0666": '6',
      // Arabic-indic digit 6
      "\u0667": '7',
      // Arabic-indic digit 7
      "\u0668": '8',
      // Arabic-indic digit 8
      "\u0669": '9',
      // Arabic-indic digit 9
      "\u06F0": '0',
      // Eastern-Arabic digit 0
      "\u06F1": '1',
      // Eastern-Arabic digit 1
      "\u06F2": '2',
      // Eastern-Arabic digit 2
      "\u06F3": '3',
      // Eastern-Arabic digit 3
      "\u06F4": '4',
      // Eastern-Arabic digit 4
      "\u06F5": '5',
      // Eastern-Arabic digit 5
      "\u06F6": '6',
      // Eastern-Arabic digit 6
      "\u06F7": '7',
      // Eastern-Arabic digit 7
      "\u06F8": '8',
      // Eastern-Arabic digit 8
      "\u06F9": '9' // Eastern-Arabic digit 9

    };
    function parseDigit(character) {
      return DIGITS[character];
    }
    /**
     * Parses phone number digits from a string.
     * Drops all punctuation leaving only digits.
     * Also converts wide-ascii and arabic-indic numerals to conventional numerals.
     * E.g. in Iraq they don't write `+442323234` but rather `+٤٤٢٣٢٣٢٣٤`.
     * @param  {string} string
     * @return {string}
     * @example
     * ```js
     * parseDigits('8 (800) 555')
     * // Outputs '8800555'.
     * ```
     */

    function parseDigits(string) {
      var result = ''; // Using `.split('')` here instead of normal `for ... of`
      // because the importing application doesn't neccessarily include an ES6 polyfill.
      // The `.split('')` approach discards "exotic" UTF-8 characters
      // (the ones consisting of four bytes) but digits
      // (including non-European ones) don't fall into that range
      // so such "exotic" characters would be discarded anyway.

      for (var _iterator = _createForOfIteratorHelperLoose$b(string.split('')), _step; !(_step = _iterator()).done;) {
        var character = _step.value;
        var digit = parseDigit(character);

        if (digit) {
          result += digit;
        }
      }

      return result;
    }

    function _createForOfIteratorHelperLoose$a(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray$d(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

    function _unsupportedIterableToArray$d(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray$d(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$d(o, minLen); }

    function _arrayLikeToArray$d(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }
    /**
     * Parses phone number characters from a string.
     * Drops all punctuation leaving only digits and the leading `+` sign (if any).
     * Also converts wide-ascii and arabic-indic numerals to conventional numerals.
     * E.g. in Iraq they don't write `+442323234` but rather `+٤٤٢٣٢٣٢٣٤`.
     * @param  {string} string
     * @return {string}
     * @example
     * ```js
     * // Outputs '8800555'.
     * parseIncompletePhoneNumber('8 (800) 555')
     * // Outputs '+7800555'.
     * parseIncompletePhoneNumber('+7 800 555')
     * ```
     */

    function parseIncompletePhoneNumber(string) {
      var result = ''; // Using `.split('')` here instead of normal `for ... of`
      // because the importing application doesn't neccessarily include an ES6 polyfill.
      // The `.split('')` approach discards "exotic" UTF-8 characters
      // (the ones consisting of four bytes) but digits
      // (including non-European ones) don't fall into that range
      // so such "exotic" characters would be discarded anyway.

      for (var _iterator = _createForOfIteratorHelperLoose$a(string.split('')), _step; !(_step = _iterator()).done;) {
        var character = _step.value;
        result += parsePhoneNumberCharacter(character, result) || '';
      }

      return result;
    }
    /**
     * Parses next character while parsing phone number digits (including a `+`)
     * from text: discards everything except `+` and digits, and `+` is only allowed
     * at the start of a phone number.
     * For example, is used in `react-phone-number-input` where it uses
     * [`input-format`](https://gitlab.com/catamphetamine/input-format).
     * @param  {string} character - Yet another character from raw input string.
     * @param  {string?} prevParsedCharacters - Previous parsed characters.
     * @param  {object} meta - Optional custom use-case-specific metadata.
     * @return {string?} The parsed character.
     */

    function parsePhoneNumberCharacter(character, prevParsedCharacters) {
      // Only allow a leading `+`.
      if (character === '+') {
        // If this `+` is not the first parsed character
        // then discard it.
        if (prevParsedCharacters) {
          return;
        }

        return '+';
      } // Allow digits.


      return parseDigit(character);
    }

    function _createForOfIteratorHelperLoose$9(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray$c(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

    function _unsupportedIterableToArray$c(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray$c(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$c(o, minLen); }

    function _arrayLikeToArray$c(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

    /**
     * Merges two arrays.
     * @param  {*} a
     * @param  {*} b
     * @return {*}
     */
    function mergeArrays(a, b) {
      var merged = a.slice();

      for (var _iterator = _createForOfIteratorHelperLoose$9(b), _step; !(_step = _iterator()).done;) {
        var element = _step.value;

        if (a.indexOf(element) < 0) {
          merged.push(element);
        }
      }

      return merged.sort(function (a, b) {
        return a - b;
      }); // ES6 version, requires Set polyfill.
      // let merged = new Set(a)
      // for (const element of b) {
      // 	merged.add(i)
      // }
      // return Array.from(merged).sort((a, b) => a - b)
    }

    function checkNumberLength(nationalNumber, metadata) {
      return checkNumberLengthForType(nationalNumber, undefined, metadata);
    } // Checks whether a number is possible for the country based on its length.
    // Should only be called for the "new" metadata which has "possible lengths".

    function checkNumberLengthForType(nationalNumber, type, metadata) {
      var type_info = metadata.type(type); // There should always be "<possiblePengths/>" set for every type element.
      // This is declared in the XML schema.
      // For size efficiency, where a sub-description (e.g. fixed-line)
      // has the same "<possiblePengths/>" as the "general description", this is missing,
      // so we fall back to the "general description". Where no numbers of the type
      // exist at all, there is one possible length (-1) which is guaranteed
      // not to match the length of any real phone number.

      var possible_lengths = type_info && type_info.possibleLengths() || metadata.possibleLengths(); // let local_lengths    = type_info && type.possibleLengthsLocal() || metadata.possibleLengthsLocal()
      // Metadata before version `1.0.18` didn't contain `possible_lengths`.

      if (!possible_lengths) {
        return 'IS_POSSIBLE';
      }

      if (type === 'FIXED_LINE_OR_MOBILE') {
        // No such country in metadata.

        /* istanbul ignore next */
        if (!metadata.type('FIXED_LINE')) {
          // The rare case has been encountered where no fixedLine data is available
          // (true for some non-geographic entities), so we just check mobile.
          return checkNumberLengthForType(nationalNumber, 'MOBILE', metadata);
        }

        var mobile_type = metadata.type('MOBILE');

        if (mobile_type) {
          // Merge the mobile data in if there was any. "Concat" creates a new
          // array, it doesn't edit possible_lengths in place, so we don't need a copy.
          // Note that when adding the possible lengths from mobile, we have
          // to again check they aren't empty since if they are this indicates
          // they are the same as the general desc and should be obtained from there.
          possible_lengths = mergeArrays(possible_lengths, mobile_type.possibleLengths()); // The current list is sorted; we need to merge in the new list and
          // re-sort (duplicates are okay). Sorting isn't so expensive because
          // the lists are very small.
          // if (local_lengths) {
          // 	local_lengths = mergeArrays(local_lengths, mobile_type.possibleLengthsLocal())
          // } else {
          // 	local_lengths = mobile_type.possibleLengthsLocal()
          // }
        }
      } // If the type doesn't exist then return 'INVALID_LENGTH'.
      else if (type && !type_info) {
        return 'INVALID_LENGTH';
      }

      var actual_length = nationalNumber.length; // In `libphonenumber-js` all "local-only" formats are dropped for simplicity.
      // // This is safe because there is never an overlap beween the possible lengths
      // // and the local-only lengths; this is checked at build time.
      // if (local_lengths && local_lengths.indexOf(nationalNumber.length) >= 0)
      // {
      // 	return 'IS_POSSIBLE_LOCAL_ONLY'
      // }

      var minimum_length = possible_lengths[0];

      if (minimum_length === actual_length) {
        return 'IS_POSSIBLE';
      }

      if (minimum_length > actual_length) {
        return 'TOO_SHORT';
      }

      if (possible_lengths[possible_lengths.length - 1] < actual_length) {
        return 'TOO_LONG';
      } // We skip the first element since we've already checked it.


      return possible_lengths.indexOf(actual_length, 1) >= 0 ? 'IS_POSSIBLE' : 'INVALID_LENGTH';
    }

    function isPossiblePhoneNumber(input, options, metadata) {
      /* istanbul ignore if */
      if (options === undefined) {
        options = {};
      }

      metadata = new Metadata(metadata);

      if (options.v2) {
        if (!input.countryCallingCode) {
          throw new Error('Invalid phone number object passed');
        }

        metadata.selectNumberingPlan(input.countryCallingCode);
      } else {
        if (!input.phone) {
          return false;
        }

        if (input.country) {
          if (!metadata.hasCountry(input.country)) {
            throw new Error("Unknown country: ".concat(input.country));
          }

          metadata.country(input.country);
        } else {
          if (!input.countryCallingCode) {
            throw new Error('Invalid phone number object passed');
          }

          metadata.selectNumberingPlan(input.countryCallingCode);
        }
      } // Old metadata (< 1.0.18) had no "possible length" data.


      if (metadata.possibleLengths()) {
        return isPossibleNumber(input.phone || input.nationalNumber, metadata);
      } else {
        // There was a bug between `1.7.35` and `1.7.37` where "possible_lengths"
        // were missing for "non-geographical" numbering plans.
        // Just assume the number is possible in such cases:
        // it's unlikely that anyone generated their custom metadata
        // in that short period of time (one day).
        // This code can be removed in some future major version update.
        if (input.countryCallingCode && metadata.isNonGeographicCallingCode(input.countryCallingCode)) {
          // "Non-geographic entities" did't have `possibleLengths`
          // due to a bug in metadata generation process.
          return true;
        } else {
          throw new Error('Missing "possibleLengths" in metadata. Perhaps the metadata has been generated before v1.0.18.');
        }
      }
    }
    function isPossibleNumber(nationalNumber, metadata) {
      //, isInternational) {
      switch (checkNumberLength(nationalNumber, metadata)) {
        case 'IS_POSSIBLE':
          return true;
        // This library ignores "local-only" phone numbers (for simplicity).
        // See the readme for more info on what are "local-only" phone numbers.
        // case 'IS_POSSIBLE_LOCAL_ONLY':
        // 	return !isInternational

        default:
          return false;
      }
    }

    function _slicedToArray$3(arr, i) { return _arrayWithHoles$3(arr) || _iterableToArrayLimit$3(arr, i) || _unsupportedIterableToArray$b(arr, i) || _nonIterableRest$3(); }

    function _nonIterableRest$3() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

    function _iterableToArrayLimit$3(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

    function _arrayWithHoles$3(arr) { if (Array.isArray(arr)) return arr; }

    function _createForOfIteratorHelperLoose$8(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray$b(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

    function _unsupportedIterableToArray$b(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray$b(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$b(o, minLen); }

    function _arrayLikeToArray$b(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

    /**
     * @param  {string} text - Phone URI (RFC 3966).
     * @return {object} `{ ?number, ?ext }`.
     */

    function parseRFC3966(text) {
      var number;
      var ext; // Replace "tel:" with "tel=" for parsing convenience.

      text = text.replace(/^tel:/, 'tel=');

      for (var _iterator = _createForOfIteratorHelperLoose$8(text.split(';')), _step; !(_step = _iterator()).done;) {
        var part = _step.value;

        var _part$split = part.split('='),
            _part$split2 = _slicedToArray$3(_part$split, 2),
            name = _part$split2[0],
            value = _part$split2[1];

        switch (name) {
          case 'tel':
            number = value;
            break;

          case 'ext':
            ext = value;
            break;

          case 'phone-context':
            // Only "country contexts" are supported.
            // "Domain contexts" are ignored.
            if (value[0] === '+') {
              number = value + number;
            }

            break;
        }
      } // If the phone number is not viable, then abort.


      if (!isViablePhoneNumber(number)) {
        return {};
      }

      var result = {
        number: number
      };

      if (ext) {
        result.ext = ext;
      }

      return result;
    }
    /**
     * @param  {object} - `{ ?number, ?extension }`.
     * @return {string} Phone URI (RFC 3966).
     */

    function formatRFC3966(_ref) {
      var number = _ref.number,
          ext = _ref.ext;

      if (!number) {
        return '';
      }

      if (number[0] !== '+') {
        throw new Error("\"formatRFC3966()\" expects \"number\" to be in E.164 format.");
      }

      return "tel:".concat(number).concat(ext ? ';ext=' + ext : '');
    }

    /**
     * Checks whether the entire input sequence can be matched
     * against the regular expression.
     * @return {boolean}
     */
    function matchesEntirely(text, regular_expression) {
      // If assigning the `''` default value is moved to the arguments above,
      // code coverage would decrease for some weird reason.
      text = text || '';
      return new RegExp('^(?:' + regular_expression + ')$').test(text);
    }

    function _createForOfIteratorHelperLoose$7(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray$a(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

    function _unsupportedIterableToArray$a(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray$a(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$a(o, minLen); }

    function _arrayLikeToArray$a(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }
    var NON_FIXED_LINE_PHONE_TYPES = ['MOBILE', 'PREMIUM_RATE', 'TOLL_FREE', 'SHARED_COST', 'VOIP', 'PERSONAL_NUMBER', 'PAGER', 'UAN', 'VOICEMAIL']; // Finds out national phone number type (fixed line, mobile, etc)

    function getNumberType(input, options, metadata) {
      // If assigning the `{}` default value is moved to the arguments above,
      // code coverage would decrease for some weird reason.
      options = options || {}; // When `parse()` returned `{}`
      // meaning that the phone number is not a valid one.

      if (!input.country) {
        return;
      }

      metadata = new Metadata(metadata);
      metadata.selectNumberingPlan(input.country, input.countryCallingCode);
      var nationalNumber = options.v2 ? input.nationalNumber : input.phone; // The following is copy-pasted from the original function:
      // https://github.com/googlei18n/libphonenumber/blob/3ea547d4fbaa2d0b67588904dfa5d3f2557c27ff/javascript/i18n/phonenumbers/phonenumberutil.js#L2835
      // Is this national number even valid for this country

      if (!matchesEntirely(nationalNumber, metadata.nationalNumberPattern())) {
        return;
      } // Is it fixed line number


      if (isNumberTypeEqualTo(nationalNumber, 'FIXED_LINE', metadata)) {
        // Because duplicate regular expressions are removed
        // to reduce metadata size, if "mobile" pattern is ""
        // then it means it was removed due to being a duplicate of the fixed-line pattern.
        //
        if (metadata.type('MOBILE') && metadata.type('MOBILE').pattern() === '') {
          return 'FIXED_LINE_OR_MOBILE';
        } // `MOBILE` type pattern isn't included if it matched `FIXED_LINE` one.
        // For example, for "US" country.
        // Old metadata (< `1.0.18`) had a specific "types" data structure
        // that happened to be `undefined` for `MOBILE` in that case.
        // Newer metadata (>= `1.0.18`) has another data structure that is
        // not `undefined` for `MOBILE` in that case (it's just an empty array).
        // So this `if` is just for backwards compatibility with old metadata.


        if (!metadata.type('MOBILE')) {
          return 'FIXED_LINE_OR_MOBILE';
        } // Check if the number happens to qualify as both fixed line and mobile.
        // (no such country in the minimal metadata set)

        /* istanbul ignore if */


        if (isNumberTypeEqualTo(nationalNumber, 'MOBILE', metadata)) {
          return 'FIXED_LINE_OR_MOBILE';
        }

        return 'FIXED_LINE';
      }

      for (var _iterator = _createForOfIteratorHelperLoose$7(NON_FIXED_LINE_PHONE_TYPES), _step; !(_step = _iterator()).done;) {
        var type = _step.value;

        if (isNumberTypeEqualTo(nationalNumber, type, metadata)) {
          return type;
        }
      }
    }
    function isNumberTypeEqualTo(nationalNumber, type, metadata) {
      type = metadata.type(type);

      if (!type || !type.pattern()) {
        return false;
      } // Check if any possible number lengths are present;
      // if so, we use them to avoid checking
      // the validation pattern if they don't match.
      // If they are absent, this means they match
      // the general description, which we have
      // already checked before a specific number type.


      if (type.possibleLengths() && type.possibleLengths().indexOf(nationalNumber.length) < 0) {
        return false;
      }

      return matchesEntirely(nationalNumber, type.pattern());
    }

    /**
     * Checks if a given phone number is valid.
     *
     * If the `number` is a string, it will be parsed to an object,
     * but only if it contains only valid phone number characters (including punctuation).
     * If the `number` is an object, it is used as is.
     *
     * The optional `defaultCountry` argument is the default country.
     * I.e. it does not restrict to just that country,
     * e.g. in those cases where several countries share
     * the same phone numbering rules (NANPA, Britain, etc).
     * For example, even though the number `07624 369230`
     * belongs to the Isle of Man ("IM" country code)
     * calling `isValidNumber('07624369230', 'GB', metadata)`
     * still returns `true` because the country is not restricted to `GB`,
     * it's just that `GB` is the default one for the phone numbering rules.
     * For restricting the country see `isValidNumberForRegion()`
     * though restricting a country might not be a good idea.
     * https://github.com/googlei18n/libphonenumber/blob/master/FAQ.md#when-should-i-use-isvalidnumberforregion
     *
     * Examples:
     *
     * ```js
     * isValidNumber('+78005553535', metadata)
     * isValidNumber('8005553535', 'RU', metadata)
     * isValidNumber('88005553535', 'RU', metadata)
     * isValidNumber({ phone: '8005553535', country: 'RU' }, metadata)
     * ```
     */

    function isValidNumber(input, options, metadata) {
      // If assigning the `{}` default value is moved to the arguments above,
      // code coverage would decrease for some weird reason.
      options = options || {};
      metadata = new Metadata(metadata); // This is just to support `isValidNumber({})`
      // for cases when `parseNumber()` returns `{}`.

      if (!input.country) {
        return false;
      }

      metadata.selectNumberingPlan(input.country, input.countryCallingCode); // By default, countries only have type regexps when it's required for
      // distinguishing different countries having the same `countryCallingCode`.

      if (metadata.hasTypes()) {
        return getNumberType(input, options, metadata.metadata) !== undefined;
      } // If there are no type regexps for this country in metadata then use
      // `nationalNumberPattern` as a "better than nothing" replacement.


      var national_number = options.v2 ? input.nationalNumber : input.phone;
      return matchesEntirely(national_number, metadata.nationalNumberPattern());
    }

    //
    // E.g. "(999) 111-22-33" -> "999 111 22 33"
    //
    // For some reason Google's metadata contains `<intlFormat/>`s with brackets and dashes.
    // Meanwhile, there's no single opinion about using punctuation in international phone numbers.
    //
    // For example, Google's `<intlFormat/>` for USA is `+1 213-373-4253`.
    // And here's a quote from WikiPedia's "North American Numbering Plan" page:
    // https://en.wikipedia.org/wiki/North_American_Numbering_Plan
    //
    // "The country calling code for all countries participating in the NANP is 1.
    // In international format, an NANP number should be listed as +1 301 555 01 00,
    // where 301 is an area code (Maryland)."
    //
    // I personally prefer the international format without any punctuation.
    // For example, brackets are remnants of the old age, meaning that the
    // phone number part in brackets (so called "area code") can be omitted
    // if dialing within the same "area".
    // And hyphens were clearly introduced for splitting local numbers into memorizable groups.
    // For example, remembering "5553535" is difficult but "555-35-35" is much simpler.
    // Imagine a man taking a bus from home to work and seeing an ad with a phone number.
    // He has a couple of seconds to memorize that number until it passes by.
    // If it were spaces instead of hyphens the man wouldn't necessarily get it,
    // but with hyphens instead of spaces the grouping is more explicit.
    // I personally think that hyphens introduce visual clutter,
    // so I prefer replacing them with spaces in international numbers.
    // In the modern age all output is done on displays where spaces are clearly distinguishable
    // so hyphens can be safely replaced with spaces without losing any legibility.
    //

    function applyInternationalSeparatorStyle(formattedNumber) {
      return formattedNumber.replace(new RegExp("[".concat(VALID_PUNCTUATION, "]+"), 'g'), ' ').trim();
    }

    // first group is not used in the national pattern (e.g. Argentina) so the $1
    // group does not match correctly. Therefore, we use `\d`, so that the first
    // group actually used in the pattern will be matched.

    var FIRST_GROUP_PATTERN = /(\$\d)/;
    function formatNationalNumberUsingFormat(number, format, _ref) {
      var useInternationalFormat = _ref.useInternationalFormat,
          withNationalPrefix = _ref.withNationalPrefix;
          _ref.carrierCode;
          _ref.metadata;
      var formattedNumber = number.replace(new RegExp(format.pattern()), useInternationalFormat ? format.internationalFormat() : // This library doesn't use `domestic_carrier_code_formatting_rule`,
      // because that one is only used when formatting phone numbers
      // for dialing from a mobile phone, and this is not a dialing library.
      // carrierCode && format.domesticCarrierCodeFormattingRule()
      // 	// First, replace the $CC in the formatting rule with the desired carrier code.
      // 	// Then, replace the $FG in the formatting rule with the first group
      // 	// and the carrier code combined in the appropriate way.
      // 	? format.format().replace(FIRST_GROUP_PATTERN, format.domesticCarrierCodeFormattingRule().replace('$CC', carrierCode))
      // 	: (
      // 		withNationalPrefix && format.nationalPrefixFormattingRule()
      // 			? format.format().replace(FIRST_GROUP_PATTERN, format.nationalPrefixFormattingRule())
      // 			: format.format()
      // 	)
      withNationalPrefix && format.nationalPrefixFormattingRule() ? format.format().replace(FIRST_GROUP_PATTERN, format.nationalPrefixFormattingRule()) : format.format());

      if (useInternationalFormat) {
        return applyInternationalSeparatorStyle(formattedNumber);
      }

      return formattedNumber;
    }

    /**
     * Pattern that makes it easy to distinguish whether a region has a single
     * international dialing prefix or not. If a region has a single international
     * prefix (e.g. 011 in USA), it will be represented as a string that contains
     * a sequence of ASCII digits, and possibly a tilde, which signals waiting for
     * the tone. If there are multiple available international prefixes in a
     * region, they will be represented as a regex string that always contains one
     * or more characters that are not ASCII digits or a tilde.
     */

    var SINGLE_IDD_PREFIX_REG_EXP = /^[\d]+(?:[~\u2053\u223C\uFF5E][\d]+)?$/; // For regions that have multiple IDD prefixes
    // a preferred IDD prefix is returned.

    function getIddPrefix(country, callingCode, metadata) {
      var countryMetadata = new Metadata(metadata);
      countryMetadata.selectNumberingPlan(country, callingCode);

      if (countryMetadata.defaultIDDPrefix()) {
        return countryMetadata.defaultIDDPrefix();
      }

      if (SINGLE_IDD_PREFIX_REG_EXP.test(countryMetadata.IDDPrefix())) {
        return countryMetadata.IDDPrefix();
      }
    }

    function _createForOfIteratorHelperLoose$6(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray$9(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

    function _unsupportedIterableToArray$9(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray$9(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$9(o, minLen); }

    function _arrayLikeToArray$9(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

    function ownKeys$7(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

    function _objectSpread$7(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys$7(Object(source), !0).forEach(function (key) { _defineProperty$7(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys$7(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

    function _defineProperty$7(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
    var DEFAULT_OPTIONS = {
      formatExtension: function formatExtension(formattedNumber, extension, metadata) {
        return "".concat(formattedNumber).concat(metadata.ext()).concat(extension);
      }
    }; // Formats a phone number
    //
    // Example use cases:
    //
    // ```js
    // formatNumber('8005553535', 'RU', 'INTERNATIONAL')
    // formatNumber('8005553535', 'RU', 'INTERNATIONAL', metadata)
    // formatNumber({ phone: '8005553535', country: 'RU' }, 'INTERNATIONAL')
    // formatNumber({ phone: '8005553535', country: 'RU' }, 'INTERNATIONAL', metadata)
    // formatNumber('+78005553535', 'NATIONAL')
    // formatNumber('+78005553535', 'NATIONAL', metadata)
    // ```
    //

    function formatNumber$1(input, format, options, metadata) {
      // Apply default options.
      if (options) {
        options = _objectSpread$7(_objectSpread$7({}, DEFAULT_OPTIONS), options);
      } else {
        options = DEFAULT_OPTIONS;
      }

      metadata = new Metadata(metadata);

      if (input.country && input.country !== '001') {
        // Validate `input.country`.
        if (!metadata.hasCountry(input.country)) {
          throw new Error("Unknown country: ".concat(input.country));
        }

        metadata.country(input.country);
      } else if (input.countryCallingCode) {
        metadata.selectNumberingPlan(input.countryCallingCode);
      } else return input.phone || '';

      var countryCallingCode = metadata.countryCallingCode();
      var nationalNumber = options.v2 ? input.nationalNumber : input.phone; // This variable should have been declared inside `case`s
      // but Babel has a bug and it says "duplicate variable declaration".

      var number;

      switch (format) {
        case 'NATIONAL':
          // Legacy argument support.
          // (`{ country: ..., phone: '' }`)
          if (!nationalNumber) {
            return '';
          }

          number = formatNationalNumber$1(nationalNumber, input.carrierCode, 'NATIONAL', metadata, options);
          return addExtension(number, input.ext, metadata, options.formatExtension);

        case 'INTERNATIONAL':
          // Legacy argument support.
          // (`{ country: ..., phone: '' }`)
          if (!nationalNumber) {
            return "+".concat(countryCallingCode);
          }

          number = formatNationalNumber$1(nationalNumber, null, 'INTERNATIONAL', metadata, options);
          number = "+".concat(countryCallingCode, " ").concat(number);
          return addExtension(number, input.ext, metadata, options.formatExtension);

        case 'E.164':
          // `E.164` doesn't define "phone number extensions".
          return "+".concat(countryCallingCode).concat(nationalNumber);

        case 'RFC3966':
          return formatRFC3966({
            number: "+".concat(countryCallingCode).concat(nationalNumber),
            ext: input.ext
          });
        // For reference, here's Google's IDD formatter:
        // https://github.com/google/libphonenumber/blob/32719cf74e68796788d1ca45abc85dcdc63ba5b9/java/libphonenumber/src/com/google/i18n/phonenumbers/PhoneNumberUtil.java#L1546
        // Not saying that this IDD formatter replicates it 1:1, but it seems to work.
        // Who would even need to format phone numbers in IDD format anyway?

        case 'IDD':
          if (!options.fromCountry) {
            return; // throw new Error('`fromCountry` option not passed for IDD-prefixed formatting.')
          }

          var formattedNumber = formatIDD(nationalNumber, input.carrierCode, countryCallingCode, options.fromCountry, metadata);
          return addExtension(formattedNumber, input.ext, metadata, options.formatExtension);

        default:
          throw new Error("Unknown \"format\" argument passed to \"formatNumber()\": \"".concat(format, "\""));
      }
    }

    function formatNationalNumber$1(number, carrierCode, formatAs, metadata, options) {
      var format = chooseFormatForNumber(metadata.formats(), number);

      if (!format) {
        return number;
      }

      return formatNationalNumberUsingFormat(number, format, {
        useInternationalFormat: formatAs === 'INTERNATIONAL',
        withNationalPrefix: format.nationalPrefixIsOptionalWhenFormattingInNationalFormat() && options && options.nationalPrefix === false ? false : true,
        carrierCode: carrierCode,
        metadata: metadata
      });
    }

    function chooseFormatForNumber(availableFormats, nationalNnumber) {
      for (var _iterator = _createForOfIteratorHelperLoose$6(availableFormats), _step; !(_step = _iterator()).done;) {
        var format = _step.value;

        // Validate leading digits.
        // The test case for "else path" could be found by searching for
        // "format.leadingDigitsPatterns().length === 0".
        if (format.leadingDigitsPatterns().length > 0) {
          // The last leading_digits_pattern is used here, as it is the most detailed
          var lastLeadingDigitsPattern = format.leadingDigitsPatterns()[format.leadingDigitsPatterns().length - 1]; // If leading digits don't match then move on to the next phone number format

          if (nationalNnumber.search(lastLeadingDigitsPattern) !== 0) {
            continue;
          }
        } // Check that the national number matches the phone number format regular expression


        if (matchesEntirely(nationalNnumber, format.pattern())) {
          return format;
        }
      }
    }

    function addExtension(formattedNumber, ext, metadata, formatExtension) {
      return ext ? formatExtension(formattedNumber, ext, metadata) : formattedNumber;
    }

    function formatIDD(nationalNumber, carrierCode, countryCallingCode, fromCountry, metadata) {
      var fromCountryCallingCode = getCountryCallingCode(fromCountry, metadata.metadata); // When calling within the same country calling code.

      if (fromCountryCallingCode === countryCallingCode) {
        var formattedNumber = formatNationalNumber$1(nationalNumber, carrierCode, 'NATIONAL', metadata); // For NANPA regions, return the national format for these regions
        // but prefix it with the country calling code.

        if (countryCallingCode === '1') {
          return countryCallingCode + ' ' + formattedNumber;
        } // If regions share a country calling code, the country calling code need
        // not be dialled. This also applies when dialling within a region, so this
        // if clause covers both these cases. Technically this is the case for
        // dialling from La Reunion to other overseas departments of France (French
        // Guiana, Martinique, Guadeloupe), but not vice versa - so we don't cover
        // this edge case for now and for those cases return the version including
        // country calling code. Details here:
        // http://www.petitfute.com/voyage/225-info-pratiques-reunion
        //


        return formattedNumber;
      }

      var iddPrefix = getIddPrefix(fromCountry, undefined, metadata.metadata);

      if (iddPrefix) {
        return "".concat(iddPrefix, " ").concat(countryCallingCode, " ").concat(formatNationalNumber$1(nationalNumber, null, 'INTERNATIONAL', metadata));
      }
    }

    function ownKeys$6(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

    function _objectSpread$6(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys$6(Object(source), !0).forEach(function (key) { _defineProperty$6(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys$6(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

    function _defineProperty$6(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

    function _classCallCheck$9(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _defineProperties$9(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

    function _createClass$9(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties$9(Constructor.prototype, protoProps); if (staticProps) _defineProperties$9(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

    var PhoneNumber = /*#__PURE__*/function () {
      function PhoneNumber(countryCallingCode, nationalNumber, metadata) {
        _classCallCheck$9(this, PhoneNumber);

        if (!countryCallingCode) {
          throw new TypeError('`country` or `countryCallingCode` not passed');
        }

        if (!nationalNumber) {
          throw new TypeError('`nationalNumber` not passed');
        }

        if (!metadata) {
          throw new TypeError('`metadata` not passed');
        }

        var _metadata = new Metadata(metadata); // If country code is passed then derive `countryCallingCode` from it.
        // Also store the country code as `.country`.


        if (isCountryCode(countryCallingCode)) {
          this.country = countryCallingCode;

          _metadata.country(countryCallingCode);

          countryCallingCode = _metadata.countryCallingCode();
        }

        this.countryCallingCode = countryCallingCode;
        this.nationalNumber = nationalNumber;
        this.number = '+' + this.countryCallingCode + this.nationalNumber;
        this.metadata = metadata;
      }

      _createClass$9(PhoneNumber, [{
        key: "setExt",
        value: function setExt(ext) {
          this.ext = ext;
        }
      }, {
        key: "isPossible",
        value: function isPossible() {
          return isPossiblePhoneNumber(this, {
            v2: true
          }, this.metadata);
        }
      }, {
        key: "isValid",
        value: function isValid() {
          return isValidNumber(this, {
            v2: true
          }, this.metadata);
        }
      }, {
        key: "isNonGeographic",
        value: function isNonGeographic() {
          var metadata = new Metadata(this.metadata);
          return metadata.isNonGeographicCallingCode(this.countryCallingCode);
        }
      }, {
        key: "isEqual",
        value: function isEqual(phoneNumber) {
          return this.number === phoneNumber.number && this.ext === phoneNumber.ext;
        } // // Is just an alias for `this.isValid() && this.country === country`.
        // // https://github.com/googlei18n/libphonenumber/blob/master/FAQ.md#when-should-i-use-isvalidnumberforregion
        // isValidForRegion(country) {
        // 	return isValidNumberForRegion(this, country, { v2: true }, this.metadata)
        // }

      }, {
        key: "getType",
        value: function getType() {
          return getNumberType(this, {
            v2: true
          }, this.metadata);
        }
      }, {
        key: "format",
        value: function format(_format, options) {
          return formatNumber$1(this, _format, options ? _objectSpread$6(_objectSpread$6({}, options), {}, {
            v2: true
          }) : {
            v2: true
          }, this.metadata);
        }
      }, {
        key: "formatNational",
        value: function formatNational(options) {
          return this.format('NATIONAL', options);
        }
      }, {
        key: "formatInternational",
        value: function formatInternational(options) {
          return this.format('INTERNATIONAL', options);
        }
      }, {
        key: "getURI",
        value: function getURI(options) {
          return this.format('RFC3966', options);
        }
      }]);

      return PhoneNumber;
    }();

    var isCountryCode = function isCountryCode(value) {
      return /^[A-Z]{2}$/.test(value);
    };

    var CAPTURING_DIGIT_PATTERN = new RegExp('([' + VALID_DIGITS + '])');
    function stripIddPrefix(number, country, callingCode, metadata) {
      if (!country) {
        return;
      } // Check if the number is IDD-prefixed.


      var countryMetadata = new Metadata(metadata);
      countryMetadata.selectNumberingPlan(country, callingCode);
      var IDDPrefixPattern = new RegExp(countryMetadata.IDDPrefix());

      if (number.search(IDDPrefixPattern) !== 0) {
        return;
      } // Strip IDD prefix.


      number = number.slice(number.match(IDDPrefixPattern)[0].length); // If there're any digits after an IDD prefix,
      // then those digits are a country calling code.
      // Since no country code starts with a `0`,
      // the code below validates that the next digit (if present) is not `0`.

      var matchedGroups = number.match(CAPTURING_DIGIT_PATTERN);

      if (matchedGroups && matchedGroups[1] != null && matchedGroups[1].length > 0) {
        if (matchedGroups[1] === '0') {
          return;
        }
      }

      return number;
    }

    /**
     * Strips any national prefix (such as 0, 1) present in a
     * (possibly incomplete) number provided.
     * "Carrier codes" are only used  in Colombia and Brazil,
     * and only when dialing within those countries from a mobile phone to a fixed line number.
     * Sometimes it won't actually strip national prefix
     * and will instead prepend some digits to the `number`:
     * for example, when number `2345678` is passed with `VI` country selected,
     * it will return `{ number: "3402345678" }`, because `340` area code is prepended.
     * @param {string} number — National number digits.
     * @param {object} metadata — Metadata with country selected.
     * @return {object} `{ nationalNumber: string, nationalPrefix: string? carrierCode: string? }`. Even if a national prefix was extracted, it's not necessarily present in the returned object, so don't rely on its presence in the returned object in order to find out whether a national prefix has been extracted or not.
     */
    function extractNationalNumberFromPossiblyIncompleteNumber(number, metadata) {
      if (number && metadata.numberingPlan.nationalPrefixForParsing()) {
        // See METADATA.md for the description of
        // `national_prefix_for_parsing` and `national_prefix_transform_rule`.
        // Attempt to parse the first digits as a national prefix.
        var prefixPattern = new RegExp('^(?:' + metadata.numberingPlan.nationalPrefixForParsing() + ')');
        var prefixMatch = prefixPattern.exec(number);

        if (prefixMatch) {
          var nationalNumber;
          var carrierCode; // https://gitlab.com/catamphetamine/libphonenumber-js/-/blob/master/METADATA.md#national_prefix_for_parsing--national_prefix_transform_rule
          // If a `national_prefix_for_parsing` has any "capturing groups"
          // then it means that the national (significant) number is equal to
          // those "capturing groups" transformed via `national_prefix_transform_rule`,
          // and nothing could be said about the actual national prefix:
          // what is it and was it even there.
          // If a `national_prefix_for_parsing` doesn't have any "capturing groups",
          // then everything it matches is a national prefix.
          // To determine whether `national_prefix_for_parsing` matched any
          // "capturing groups", the value of the result of calling `.exec()`
          // is looked at, and if it has non-undefined values where there're
          // "capturing groups" in the regular expression, then it means
          // that "capturing groups" have been matched.
          // It's not possible to tell whether there'll be any "capturing gropus"
          // before the matching process, because a `national_prefix_for_parsing`
          // could exhibit both behaviors.

          var capturedGroupsCount = prefixMatch.length - 1;
          var hasCapturedGroups = capturedGroupsCount > 0 && prefixMatch[capturedGroupsCount];

          if (metadata.nationalPrefixTransformRule() && hasCapturedGroups) {
            nationalNumber = number.replace(prefixPattern, metadata.nationalPrefixTransformRule()); // If there's more than one captured group,
            // then carrier code is the second one.

            if (capturedGroupsCount > 1) {
              carrierCode = prefixMatch[1];
            }
          } // If there're no "capturing groups",
          // or if there're "capturing groups" but no
          // `national_prefix_transform_rule`,
          // then just strip the national prefix from the number,
          // and possibly a carrier code.
          // Seems like there could be more.
          else {
            // `prefixBeforeNationalNumber` is the whole substring matched by
            // the `national_prefix_for_parsing` regular expression.
            // There seem to be no guarantees that it's just a national prefix.
            // For example, if there's a carrier code, it's gonna be a
            // part of `prefixBeforeNationalNumber` too.
            var prefixBeforeNationalNumber = prefixMatch[0];
            nationalNumber = number.slice(prefixBeforeNationalNumber.length); // If there's at least one captured group,
            // then carrier code is the first one.

            if (hasCapturedGroups) {
              carrierCode = prefixMatch[1];
            }
          } // Tries to guess whether a national prefix was present in the input.
          // This is not something copy-pasted from Google's library:
          // they don't seem to have an equivalent for that.
          // So this isn't an "officially approved" way of doing something like that.
          // But since there seems no other existing method, this library uses it.


          var nationalPrefix;

          if (hasCapturedGroups) {
            var possiblePositionOfTheFirstCapturedGroup = number.indexOf(prefixMatch[1]);
            var possibleNationalPrefix = number.slice(0, possiblePositionOfTheFirstCapturedGroup); // Example: an Argentinian (AR) phone number `0111523456789`.
            // `prefixMatch[0]` is `01115`, and `$1` is `11`,
            // and the rest of the phone number is `23456789`.
            // The national number is transformed via `9$1` to `91123456789`.
            // National prefix `0` is detected being present at the start.
            // if (possibleNationalPrefix.indexOf(metadata.numberingPlan.nationalPrefix()) === 0) {

            if (possibleNationalPrefix === metadata.numberingPlan.nationalPrefix()) {
              nationalPrefix = metadata.numberingPlan.nationalPrefix();
            }
          } else {
            nationalPrefix = prefixMatch[0];
          }

          return {
            nationalNumber: nationalNumber,
            nationalPrefix: nationalPrefix,
            carrierCode: carrierCode
          };
        }
      }

      return {
        nationalNumber: number
      };
    }

    /**
     * Strips national prefix and carrier code from a complete phone number.
     * The difference from the non-"FromCompleteNumber" function is that
     * it won't extract national prefix if the resultant number is too short
     * to be a complete number for the selected phone numbering plan.
     * @param  {string} number — Complete phone number digits.
     * @param  {Metadata} metadata — Metadata with a phone numbering plan selected.
     * @return {object} `{ nationalNumber: string, carrierCode: string? }`.
     */

    function extractNationalNumber(number, metadata) {
      // Parsing national prefixes and carrier codes
      // is only required for local phone numbers
      // but some people don't understand that
      // and sometimes write international phone numbers
      // with national prefixes (or maybe even carrier codes).
      // http://ucken.blogspot.ru/2016/03/trunk-prefixes-in-skype4b.html
      // Google's original library forgives such mistakes
      // and so does this library, because it has been requested:
      // https://github.com/catamphetamine/libphonenumber-js/issues/127
      var _extractNationalNumbe = extractNationalNumberFromPossiblyIncompleteNumber(number, metadata),
          carrierCode = _extractNationalNumbe.carrierCode,
          nationalNumber = _extractNationalNumbe.nationalNumber;

      if (nationalNumber !== number) {
        if (!shouldHaveExtractedNationalPrefix(number, nationalNumber, metadata)) {
          // Don't strip the national prefix.
          return {
            nationalNumber: number
          };
        } // Check the national (significant) number length after extracting national prefix and carrier code.
        // Legacy generated metadata (before `1.0.18`) didn't support the "possible lengths" feature.


        if (metadata.possibleLengths()) {
          // The number remaining after stripping the national prefix and carrier code
          // should be long enough to have a possible length for the country.
          // Otherwise, don't strip the national prefix and carrier code,
          // since the original number could be a valid number.
          // This check has been copy-pasted "as is" from Google's original library:
          // https://github.com/google/libphonenumber/blob/876268eb1ad6cdc1b7b5bef17fc5e43052702d57/java/libphonenumber/src/com/google/i18n/phonenumbers/PhoneNumberUtil.java#L3236-L3250
          // It doesn't check for the "possibility" of the original `number`.
          // I guess it's fine not checking that one. It works as is anyway.
          if (!isPossibleIncompleteNationalNumber(nationalNumber, metadata)) {
            // Don't strip the national prefix.
            return {
              nationalNumber: number
            };
          }
        }
      }

      return {
        nationalNumber: nationalNumber,
        carrierCode: carrierCode
      };
    } // In some countries, the same digit could be a national prefix
    // or a leading digit of a valid phone number.
    // For example, in Russia, national prefix is `8`,
    // and also `800 555 35 35` is a valid number
    // in which `8` is not a national prefix, but the first digit
    // of a national (significant) number.
    // Same's with Belarus:
    // `82004910060` is a valid national (significant) number,
    // but `2004910060` is not.
    // To support such cases (to prevent the code from always stripping
    // national prefix), a condition is imposed: a national prefix
    // is not extracted when the original number is "viable" and the
    // resultant number is not, a "viable" national number being the one
    // that matches `national_number_pattern`.

    function shouldHaveExtractedNationalPrefix(nationalNumberBefore, nationalNumberAfter, metadata) {
      // The equivalent in Google's code is:
      // https://github.com/google/libphonenumber/blob/e326fa1fc4283bb05eb35cb3c15c18f98a31af33/java/libphonenumber/src/com/google/i18n/phonenumbers/PhoneNumberUtil.java#L2969-L3004
      if (matchesEntirely(nationalNumberBefore, metadata.nationalNumberPattern()) && !matchesEntirely(nationalNumberAfter, metadata.nationalNumberPattern())) {
        return false;
      } // This "is possible" national number (length) check has been commented out
      // because it's superceded by the (effectively) same check done in the
      // `extractNationalNumber()` function after it calls `shouldHaveExtractedNationalPrefix()`.
      // In other words, why run the same check twice if it could only be run once.
      // // Check the national (significant) number length after extracting national prefix and carrier code.
      // // Fixes a minor "weird behavior" bug: https://gitlab.com/catamphetamine/libphonenumber-js/-/issues/57
      // // (Legacy generated metadata (before `1.0.18`) didn't support the "possible lengths" feature).
      // if (metadata.possibleLengths()) {
      // 	if (isPossibleIncompleteNationalNumber(nationalNumberBefore, metadata) &&
      // 		!isPossibleIncompleteNationalNumber(nationalNumberAfter, metadata)) {
      // 		return false
      // 	}
      // }


      return true;
    }

    function isPossibleIncompleteNationalNumber(nationalNumber, metadata) {
      switch (checkNumberLength(nationalNumber, metadata)) {
        case 'TOO_SHORT':
        case 'INVALID_LENGTH':
          // This library ignores "local-only" phone numbers (for simplicity).
          // See the readme for more info on what are "local-only" phone numbers.
          // case 'IS_POSSIBLE_LOCAL_ONLY':
          return false;

        default:
          return true;
      }
    }

    /**
     * Sometimes some people incorrectly input international phone numbers
     * without the leading `+`. This function corrects such input.
     * @param  {string} number — Phone number digits.
     * @param  {string?} country
     * @param  {string?} callingCode
     * @param  {object} metadata
     * @return {object} `{ countryCallingCode: string?, number: string }`.
     */

    function extractCountryCallingCodeFromInternationalNumberWithoutPlusSign(number, country, callingCode, metadata) {
      var countryCallingCode = country ? getCountryCallingCode(country, metadata) : callingCode;

      if (number.indexOf(countryCallingCode) === 0) {
        metadata = new Metadata(metadata);
        metadata.selectNumberingPlan(country, callingCode);
        var possibleShorterNumber = number.slice(countryCallingCode.length);

        var _extractNationalNumbe = extractNationalNumber(possibleShorterNumber, metadata),
            possibleShorterNationalNumber = _extractNationalNumbe.nationalNumber;

        var _extractNationalNumbe2 = extractNationalNumber(number, metadata),
            nationalNumber = _extractNationalNumbe2.nationalNumber; // If the number was not valid before but is valid now,
        // or if it was too long before, we consider the number
        // with the country calling code stripped to be a better result
        // and keep that instead.
        // For example, in Germany (+49), `49` is a valid area code,
        // so if a number starts with `49`, it could be both a valid
        // national German number or an international number without
        // a leading `+`.


        if (!matchesEntirely(nationalNumber, metadata.nationalNumberPattern()) && matchesEntirely(possibleShorterNationalNumber, metadata.nationalNumberPattern()) || checkNumberLength(nationalNumber, metadata) === 'TOO_LONG') {
          return {
            countryCallingCode: countryCallingCode,
            number: possibleShorterNumber
          };
        }
      }

      return {
        number: number
      };
    }

    /**
     * Converts a phone number digits (possibly with a `+`)
     * into a calling code and the rest phone number digits.
     * The "rest phone number digits" could include
     * a national prefix, carrier code, and national
     * (significant) number.
     * @param  {string} number — Phone number digits (possibly with a `+`).
     * @param  {string} [country] — Default country.
     * @param  {string} [callingCode] — Default calling code (some phone numbering plans are non-geographic).
     * @param  {object} metadata
     * @return {object} `{ countryCallingCode: string?, number: string }`
     * @example
     * // Returns `{ countryCallingCode: "1", number: "2133734253" }`.
     * extractCountryCallingCode('2133734253', 'US', null, metadata)
     * extractCountryCallingCode('2133734253', null, '1', metadata)
     * extractCountryCallingCode('+12133734253', null, null, metadata)
     * extractCountryCallingCode('+12133734253', 'RU', null, metadata)
     */

    function extractCountryCallingCode(number, country, callingCode, metadata) {
      if (!number) {
        return {};
      } // If this is not an international phone number,
      // then either extract an "IDD" prefix, or extract a
      // country calling code from a number by autocorrecting it
      // by prepending a leading `+` in cases when it starts
      // with the country calling code.
      // https://wikitravel.org/en/International_dialling_prefix
      // https://github.com/catamphetamine/libphonenumber-js/issues/376


      if (number[0] !== '+') {
        // Convert an "out-of-country" dialing phone number
        // to a proper international phone number.
        var numberWithoutIDD = stripIddPrefix(number, country, callingCode, metadata); // If an IDD prefix was stripped then
        // convert the number to international one
        // for subsequent parsing.

        if (numberWithoutIDD && numberWithoutIDD !== number) {
          number = '+' + numberWithoutIDD;
        } else {
          // Check to see if the number starts with the country calling code
          // for the default country. If so, we remove the country calling code,
          // and do some checks on the validity of the number before and after.
          // https://github.com/catamphetamine/libphonenumber-js/issues/376
          if (country || callingCode) {
            var _extractCountryCallin = extractCountryCallingCodeFromInternationalNumberWithoutPlusSign(number, country, callingCode, metadata),
                countryCallingCode = _extractCountryCallin.countryCallingCode,
                shorterNumber = _extractCountryCallin.number;

            if (countryCallingCode) {
              return {
                countryCallingCode: countryCallingCode,
                number: shorterNumber
              };
            }
          }

          return {
            number: number
          };
        }
      } // Fast abortion: country codes do not begin with a '0'


      if (number[1] === '0') {
        return {};
      }

      metadata = new Metadata(metadata); // The thing with country phone codes
      // is that they are orthogonal to each other
      // i.e. there's no such country phone code A
      // for which country phone code B exists
      // where B starts with A.
      // Therefore, while scanning digits,
      // if a valid country code is found,
      // that means that it is the country code.
      //

      var i = 2;

      while (i - 1 <= MAX_LENGTH_COUNTRY_CODE && i <= number.length) {
        var _countryCallingCode = number.slice(1, i);

        if (metadata.hasCallingCode(_countryCallingCode)) {
          metadata.selectNumberingPlan(_countryCallingCode);
          return {
            countryCallingCode: _countryCallingCode,
            number: number.slice(i)
          };
        }

        i++;
      }

      return {};
    }

    function _createForOfIteratorHelperLoose$5(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray$8(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

    function _unsupportedIterableToArray$8(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray$8(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$8(o, minLen); }

    function _arrayLikeToArray$8(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }
    var USE_NON_GEOGRAPHIC_COUNTRY_CODE = false;
    function getCountryByCallingCode(callingCode, nationalPhoneNumber, metadata) {
      /* istanbul ignore if */
      if (USE_NON_GEOGRAPHIC_COUNTRY_CODE) {
        if (metadata.isNonGeographicCallingCode(callingCode)) {
          return '001';
        }
      } // Is always non-empty, because `callingCode` is always valid


      var possibleCountries = metadata.getCountryCodesForCallingCode(callingCode);

      if (!possibleCountries) {
        return;
      } // If there's just one country corresponding to the country code,
      // then just return it, without further phone number digits validation.


      if (possibleCountries.length === 1) {
        return possibleCountries[0];
      }

      return selectCountryFromList(possibleCountries, nationalPhoneNumber, metadata.metadata);
    }

    function selectCountryFromList(possibleCountries, nationalPhoneNumber, metadata) {
      // Re-create `metadata` because it will be selecting a `country`.
      metadata = new Metadata(metadata);

      for (var _iterator = _createForOfIteratorHelperLoose$5(possibleCountries), _step; !(_step = _iterator()).done;) {
        var country = _step.value;
        metadata.country(country); // Leading digits check would be the simplest and fastest one.
        // Leading digits patterns are only defined for about 20% of all countries.
        // https://gitlab.com/catamphetamine/libphonenumber-js/blob/master/METADATA.md#leading_digits
        // Matching "leading digits" is a sufficient but not necessary condition.

        if (metadata.leadingDigits()) {
          if (nationalPhoneNumber && nationalPhoneNumber.search(metadata.leadingDigits()) === 0) {
            return country;
          }
        } // Else perform full validation with all of those
        // fixed-line/mobile/etc regular expressions.
        else if (getNumberType({
          phone: nationalPhoneNumber,
          country: country
        }, undefined, metadata.metadata)) {
          return country;
        }
      }
    }

    // This is a port of Google Android `libphonenumber`'s
    // This prevents malicious input from consuming CPU.

    var MAX_INPUT_STRING_LENGTH = 250; // This consists of the plus symbol, digits, and arabic-indic digits.

    var PHONE_NUMBER_START_PATTERN = new RegExp('[' + PLUS_CHARS + VALID_DIGITS + ']'); // Regular expression of trailing characters that we want to remove.
    // A trailing `#` is sometimes used when writing phone numbers with extensions in US.
    // Example: "+1 (645) 123 1234-910#" number has extension "910".

    var AFTER_PHONE_NUMBER_END_PATTERN = new RegExp('[^' + VALID_DIGITS + '#' + ']+$');
    //
    // ```js
    // parse('8 (800) 555-35-35', 'RU')
    // parse('8 (800) 555-35-35', 'RU', metadata)
    // parse('8 (800) 555-35-35', { country: { default: 'RU' } })
    // parse('8 (800) 555-35-35', { country: { default: 'RU' } }, metadata)
    // parse('+7 800 555 35 35')
    // parse('+7 800 555 35 35', metadata)
    // ```
    //

    function parse(text, options, metadata) {
      // If assigning the `{}` default value is moved to the arguments above,
      // code coverage would decrease for some weird reason.
      options = options || {};
      metadata = new Metadata(metadata); // Validate `defaultCountry`.

      if (options.defaultCountry && !metadata.hasCountry(options.defaultCountry)) {
        if (options.v2) {
          throw new ParseError('INVALID_COUNTRY');
        }

        throw new Error("Unknown country: ".concat(options.defaultCountry));
      } // Parse the phone number.


      var _parseInput = parseInput(text, options.v2, options.extract),
          formattedPhoneNumber = _parseInput.number,
          ext = _parseInput.ext,
          error = _parseInput.error; // If the phone number is not viable then return nothing.


      if (!formattedPhoneNumber) {
        if (options.v2) {
          if (error === 'TOO_SHORT') {
            throw new ParseError('TOO_SHORT');
          }

          throw new ParseError('NOT_A_NUMBER');
        }

        return {};
      }

      var _parsePhoneNumber = parsePhoneNumber$1(formattedPhoneNumber, options.defaultCountry, options.defaultCallingCode, metadata),
          country = _parsePhoneNumber.country,
          nationalNumber = _parsePhoneNumber.nationalNumber,
          countryCallingCode = _parsePhoneNumber.countryCallingCode,
          carrierCode = _parsePhoneNumber.carrierCode;

      if (!metadata.hasSelectedNumberingPlan()) {
        if (options.v2) {
          throw new ParseError('INVALID_COUNTRY');
        }

        return {};
      } // Validate national (significant) number length.


      if (!nationalNumber || nationalNumber.length < MIN_LENGTH_FOR_NSN) {
        // Won't throw here because the regexp already demands length > 1.

        /* istanbul ignore if */
        if (options.v2) {
          throw new ParseError('TOO_SHORT');
        } // Google's demo just throws an error in this case.


        return {};
      } // Validate national (significant) number length.
      //
      // A sidenote:
      //
      // They say that sometimes national (significant) numbers
      // can be longer than `MAX_LENGTH_FOR_NSN` (e.g. in Germany).
      // https://github.com/googlei18n/libphonenumber/blob/7e1748645552da39c4e1ba731e47969d97bdb539/resources/phonenumber.proto#L36
      // Such numbers will just be discarded.
      //


      if (nationalNumber.length > MAX_LENGTH_FOR_NSN) {
        if (options.v2) {
          throw new ParseError('TOO_LONG');
        } // Google's demo just throws an error in this case.


        return {};
      }

      if (options.v2) {
        var phoneNumber = new PhoneNumber(countryCallingCode, nationalNumber, metadata.metadata);

        if (country) {
          phoneNumber.country = country;
        }

        if (carrierCode) {
          phoneNumber.carrierCode = carrierCode;
        }

        if (ext) {
          phoneNumber.ext = ext;
        }

        return phoneNumber;
      } // Check if national phone number pattern matches the number.
      // National number pattern is different for each country,
      // even for those ones which are part of the "NANPA" group.


      var valid = (options.extended ? metadata.hasSelectedNumberingPlan() : country) ? matchesEntirely(nationalNumber, metadata.nationalNumberPattern()) : false;

      if (!options.extended) {
        return valid ? result(country, nationalNumber, ext) : {};
      } // isInternational: countryCallingCode !== undefined


      return {
        country: country,
        countryCallingCode: countryCallingCode,
        carrierCode: carrierCode,
        valid: valid,
        possible: valid ? true : options.extended === true && metadata.possibleLengths() && isPossibleNumber(nationalNumber, metadata) ? true : false,
        phone: nationalNumber,
        ext: ext
      };
    }
    /**
     * Extracts a formatted phone number from text.
     * Doesn't guarantee that the extracted phone number
     * is a valid phone number (for example, doesn't validate its length).
     * @param  {string} text
     * @param  {boolean} [extract] — If `false`, then will parse the entire `text` as a phone number.
     * @param  {boolean} [throwOnError] — By default, it won't throw if the text is too long.
     * @return {string}
     * @example
     * // Returns "(213) 373-4253".
     * extractFormattedPhoneNumber("Call (213) 373-4253 for assistance.")
     */

    function extractFormattedPhoneNumber$1(text, extract, throwOnError) {
      if (!text) {
        return;
      }

      if (text.length > MAX_INPUT_STRING_LENGTH) {
        if (throwOnError) {
          throw new ParseError('TOO_LONG');
        }

        return;
      }

      if (extract === false) {
        return text;
      } // Attempt to extract a possible number from the string passed in


      var startsAt = text.search(PHONE_NUMBER_START_PATTERN);

      if (startsAt < 0) {
        return;
      }

      return text // Trim everything to the left of the phone number
      .slice(startsAt) // Remove trailing non-numerical characters
      .replace(AFTER_PHONE_NUMBER_END_PATTERN, '');
    }
    /**
     * @param  {string} text - Input.
     * @param  {boolean} v2 - Legacy API functions don't pass `v2: true` flag.
     * @param  {boolean} [extract] - Whether to extract a phone number from `text`, or attempt to parse the entire text as a phone number.
     * @return {object} `{ ?number, ?ext }`.
     */


    function parseInput(text, v2, extract) {
      // Parse RFC 3966 phone number URI.
      if (text && text.indexOf('tel:') === 0) {
        return parseRFC3966(text);
      }

      var number = extractFormattedPhoneNumber$1(text, extract, v2); // If the phone number is not viable, then abort.

      if (!number) {
        return {};
      }

      if (!isViablePhoneNumber(number)) {
        if (isViablePhoneNumberStart(number)) {
          return {
            error: 'TOO_SHORT'
          };
        }

        return {};
      } // Attempt to parse extension first, since it doesn't require region-specific
      // data and we want to have the non-normalised number here.


      var withExtensionStripped = extractExtension(number);

      if (withExtensionStripped.ext) {
        return withExtensionStripped;
      }

      return {
        number: number
      };
    }
    /**
     * Creates `parse()` result object.
     */


    function result(country, nationalNumber, ext) {
      var result = {
        country: country,
        phone: nationalNumber
      };

      if (ext) {
        result.ext = ext;
      }

      return result;
    }
    /**
     * Parses a viable phone number.
     * @param {string} formattedPhoneNumber — Example: "(213) 373-4253".
     * @param {string} [defaultCountry]
     * @param {string} [defaultCallingCode]
     * @param {Metadata} metadata
     * @return {object} Returns `{ country: string?, countryCallingCode: string?, nationalNumber: string? }`.
     */


    function parsePhoneNumber$1(formattedPhoneNumber, defaultCountry, defaultCallingCode, metadata) {
      // Extract calling code from phone number.
      var _extractCountryCallin = extractCountryCallingCode(parseIncompletePhoneNumber(formattedPhoneNumber), defaultCountry, defaultCallingCode, metadata.metadata),
          countryCallingCode = _extractCountryCallin.countryCallingCode,
          number = _extractCountryCallin.number; // Choose a country by `countryCallingCode`.


      var country;

      if (countryCallingCode) {
        metadata.selectNumberingPlan(countryCallingCode);
      } // If `formattedPhoneNumber` is in "national" format
      // then `number` is defined and `countryCallingCode` isn't.
      else if (number && (defaultCountry || defaultCallingCode)) {
        metadata.selectNumberingPlan(defaultCountry, defaultCallingCode);

        if (defaultCountry) {
          country = defaultCountry;
        }

        countryCallingCode = defaultCallingCode || getCountryCallingCode(defaultCountry, metadata.metadata);
      } else return {};

      if (!number) {
        return {
          countryCallingCode: countryCallingCode
        };
      }

      var _extractNationalNumbe = extractNationalNumber(parseIncompletePhoneNumber(number), metadata),
          nationalNumber = _extractNationalNumbe.nationalNumber,
          carrierCode = _extractNationalNumbe.carrierCode; // Sometimes there are several countries
      // corresponding to the same country phone code
      // (e.g. NANPA countries all having `1` country phone code).
      // Therefore, to reliably determine the exact country,
      // national (significant) number should have been parsed first.
      //
      // When `metadata.json` is generated, all "ambiguous" country phone codes
      // get their countries populated with the full set of
      // "phone number type" regular expressions.
      //


      var exactCountry = getCountryByCallingCode(countryCallingCode, nationalNumber, metadata);

      if (exactCountry) {
        country = exactCountry;
        /* istanbul ignore if */

        if (exactCountry === '001') ; else {
          metadata.country(country);
        }
      }

      return {
        country: country,
        countryCallingCode: countryCallingCode,
        nationalNumber: nationalNumber,
        carrierCode: carrierCode
      };
    }

    function ownKeys$5(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

    function _objectSpread$5(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys$5(Object(source), !0).forEach(function (key) { _defineProperty$5(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys$5(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

    function _defineProperty$5(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
    function parsePhoneNumber(text, options, metadata) {
      return parse(text, _objectSpread$5(_objectSpread$5({}, options), {}, {
        v2: true
      }), metadata);
    }

    function _typeof$2(obj) { "@babel/helpers - typeof"; return _typeof$2 = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof$2(obj); }

    function ownKeys$4(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

    function _objectSpread$4(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys$4(Object(source), !0).forEach(function (key) { _defineProperty$4(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys$4(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

    function _defineProperty$4(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

    function _slicedToArray$2(arr, i) { return _arrayWithHoles$2(arr) || _iterableToArrayLimit$2(arr, i) || _unsupportedIterableToArray$7(arr, i) || _nonIterableRest$2(); }

    function _nonIterableRest$2() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

    function _unsupportedIterableToArray$7(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray$7(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$7(o, minLen); }

    function _arrayLikeToArray$7(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

    function _iterableToArrayLimit$2(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

    function _arrayWithHoles$2(arr) { if (Array.isArray(arr)) return arr; }
    function normalizeArguments(args) {
      var _Array$prototype$slic = Array.prototype.slice.call(args),
          _Array$prototype$slic2 = _slicedToArray$2(_Array$prototype$slic, 4),
          arg_1 = _Array$prototype$slic2[0],
          arg_2 = _Array$prototype$slic2[1],
          arg_3 = _Array$prototype$slic2[2],
          arg_4 = _Array$prototype$slic2[3];

      var text;
      var options;
      var metadata; // If the phone number is passed as a string.
      // `parsePhoneNumber('88005553535', ...)`.

      if (typeof arg_1 === 'string') {
        text = arg_1;
      } else throw new TypeError('A text for parsing must be a string.'); // If "default country" argument is being passed then move it to `options`.
      // `parsePhoneNumber('88005553535', 'RU', [options], metadata)`.


      if (!arg_2 || typeof arg_2 === 'string') {
        if (arg_4) {
          options = arg_3;
          metadata = arg_4;
        } else {
          options = undefined;
          metadata = arg_3;
        }

        if (arg_2) {
          options = _objectSpread$4({
            defaultCountry: arg_2
          }, options);
        }
      } // `defaultCountry` is not passed.
      // Example: `parsePhoneNumber('+78005553535', [options], metadata)`.
      else if (isObject(arg_2)) {
        if (arg_3) {
          options = arg_2;
          metadata = arg_3;
        } else {
          metadata = arg_2;
        }
      } else throw new Error("Invalid second argument: ".concat(arg_2));

      return {
        text: text,
        options: options,
        metadata: metadata
      };
    } // Otherwise istanbul would show this as "branch not covered".

    /* istanbul ignore next */

    var isObject = function isObject(_) {
      return _typeof$2(_) === 'object';
    };

    function ownKeys$3(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

    function _objectSpread$3(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys$3(Object(source), !0).forEach(function (key) { _defineProperty$3(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys$3(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

    function _defineProperty$3(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
    function parsePhoneNumberFromString(text, options, metadata) {
      // Validate `defaultCountry`.
      if (options && options.defaultCountry && !isSupportedCountry(options.defaultCountry, metadata)) {
        options = _objectSpread$3(_objectSpread$3({}, options), {}, {
          defaultCountry: undefined
        });
      } // Parse phone number.


      try {
        return parsePhoneNumber(text, options, metadata);
      } catch (error) {
        /* istanbul ignore else */
        if (error instanceof ParseError) ; else {
          throw error;
        }
      }
    }

    function ownKeys$2(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

    function _objectSpread$2(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys$2(Object(source), !0).forEach(function (key) { _defineProperty$2(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys$2(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

    function _defineProperty$2(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
    function isValidPhoneNumber$1() {
      var _normalizeArguments = normalizeArguments(arguments),
          text = _normalizeArguments.text,
          options = _normalizeArguments.options,
          metadata = _normalizeArguments.metadata;

      options = _objectSpread$2(_objectSpread$2({}, options), {}, {
        extract: false
      });
      var phoneNumber = parsePhoneNumberFromString(text, options, metadata);
      return phoneNumber && phoneNumber.isValid() || false;
    }

    function _defineProperties$8(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

    function _createClass$8(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties$8(Constructor.prototype, protoProps); if (staticProps) _defineProperties$8(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

    function _classCallCheck$8(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    // https://medium.com/dsinjs/implementing-lru-cache-in-javascript-94ba6755cda9
    var Node = /*#__PURE__*/_createClass$8(function Node(key, value) {
      var next = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;
      var prev = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : null;

      _classCallCheck$8(this, Node);

      this.key = key;
      this.value = value;
      this.next = next;
      this.prev = prev;
    });

    var LRUCache = /*#__PURE__*/function () {
      //set default limit of 10 if limit is not passed.
      function LRUCache() {
        var limit = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 10;

        _classCallCheck$8(this, LRUCache);

        this.size = 0;
        this.limit = limit;
        this.head = null;
        this.tail = null;
        this.cache = {};
      } // Write Node to head of LinkedList
      // update cache with Node key and Node reference


      _createClass$8(LRUCache, [{
        key: "put",
        value: function put(key, value) {
          this.ensureLimit();

          if (!this.head) {
            this.head = this.tail = new Node(key, value);
          } else {
            var node = new Node(key, value, this.head);
            this.head.prev = node;
            this.head = node;
          } //Update the cache map


          this.cache[key] = this.head;
          this.size++;
        } // Read from cache map and make that node as new Head of LinkedList

      }, {
        key: "get",
        value: function get(key) {
          if (this.cache[key]) {
            var value = this.cache[key].value; // node removed from it's position and cache

            this.remove(key); // write node again to the head of LinkedList to make it most recently used

            this.put(key, value);
            return value;
          }

          console.log("Item not available in cache for key ".concat(key));
        }
      }, {
        key: "ensureLimit",
        value: function ensureLimit() {
          if (this.size === this.limit) {
            this.remove(this.tail.key);
          }
        }
      }, {
        key: "remove",
        value: function remove(key) {
          var node = this.cache[key];

          if (node.prev !== null) {
            node.prev.next = node.next;
          } else {
            this.head = node.next;
          }

          if (node.next !== null) {
            node.next.prev = node.prev;
          } else {
            this.tail = node.prev;
          }

          delete this.cache[key];
          this.size--;
        }
      }, {
        key: "clear",
        value: function clear() {
          this.head = null;
          this.tail = null;
          this.size = 0;
          this.cache = {};
        } // // Invokes the callback function with every node of the chain and the index of the node.
        // forEach(fn) {
        //   let node = this.head;
        //   let counter = 0;
        //   while (node) {
        //     fn(node, counter);
        //     node = node.next;
        //     counter++;
        //   }
        // }
        // // To iterate over LRU with a 'for...of' loop
        // *[Symbol.iterator]() {
        //   let node = this.head;
        //   while (node) {
        //     yield node;
        //     node = node.next;
        //   }
        // }

      }]);

      return LRUCache;
    }();

    function _classCallCheck$7(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _defineProperties$7(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

    function _createClass$7(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties$7(Constructor.prototype, protoProps); if (staticProps) _defineProperties$7(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
    // countries being used for the same doc with ~10 patterns for each country. Some pages will have
    // a lot more countries in use, but typically fewer numbers for each so expanding the cache for
    // that use-case won't have a lot of benefit.

    var RegExpCache = /*#__PURE__*/function () {
      function RegExpCache(size) {
        _classCallCheck$7(this, RegExpCache);

        this.cache = new LRUCache(size);
      }

      _createClass$7(RegExpCache, [{
        key: "getPatternForRegExp",
        value: function getPatternForRegExp(pattern) {
          var regExp = this.cache.get(pattern);

          if (!regExp) {
            regExp = new RegExp('^' + pattern);
            this.cache.put(pattern, regExp);
          }

          return regExp;
        }
      }]);

      return RegExpCache;
    }();

    /** Returns a regular expression quantifier with an upper and lower limit. */
    function limit(lower, upper) {
      if (lower < 0 || upper <= 0 || upper < lower) {
        throw new TypeError();
      }

      return "{".concat(lower, ",").concat(upper, "}");
    }
    /**
     * Trims away any characters after the first match of {@code pattern} in {@code candidate},
     * returning the trimmed version.
     */

    function trimAfterFirstMatch(regexp, string) {
      var index = string.search(regexp);

      if (index >= 0) {
        return string.slice(0, index);
      }

      return string;
    }
    function startsWith(string, substring) {
      return string.indexOf(substring) === 0;
    }
    function endsWith(string, substring) {
      return string.indexOf(substring, string.length - substring.length) === string.length - substring.length;
    }

    // Javascript doesn't support UTF-8 regular expressions.
    // So mimicking them here.
    // Copy-pasted from `PhoneNumberMatcher.js`.

    /**
     * "\p{Z}" is any kind of whitespace or invisible separator ("Separator").
     * http://www.regular-expressions.info/unicode.html
     * "\P{Z}" is the reverse of "\p{Z}".
     * "\p{N}" is any kind of numeric character in any script ("Number").
     * "\p{Nd}" is a digit zero through nine in any script except "ideographic scripts" ("Decimal_Digit_Number").
     * "\p{Sc}" is a currency symbol ("Currency_Symbol").
     * "\p{L}" is any kind of letter from any language ("Letter").
     * "\p{Mn}" is "non-spacing mark".
     *
     * Javascript doesn't support Unicode Regular Expressions
     * so substituting it with this explicit set of characters.
     *
     * https://stackoverflow.com/questions/13210194/javascript-regex-equivalent-of-a-za-z-using-pl
     * https://github.com/danielberndt/babel-plugin-utf-8-regex/blob/master/src/transformer.js
     */
    var _pZ = " \xA0\u1680\u180E\u2000-\u200A\u2028\u2029\u202F\u205F\u3000";
    var pZ = "[".concat(_pZ, "]");
    var PZ = "[^".concat(_pZ, "]");
    var _pN = "0-9\xB2\xB3\xB9\xBC-\xBE\u0660-\u0669\u06F0-\u06F9\u07C0-\u07C9\u0966-\u096F\u09E6-\u09EF\u09F4-\u09F9\u0A66-\u0A6F\u0AE6-\u0AEF\u0B66-\u0B6F\u0B72-\u0B77\u0BE6-\u0BF2\u0C66-\u0C6F\u0C78-\u0C7E\u0CE6-\u0CEF\u0D66-\u0D75\u0E50-\u0E59\u0ED0-\u0ED9\u0F20-\u0F33\u1040-\u1049\u1090-\u1099\u1369-\u137C\u16EE-\u16F0\u17E0-\u17E9\u17F0-\u17F9\u1810-\u1819\u1946-\u194F\u19D0-\u19DA\u1A80-\u1A89\u1A90-\u1A99\u1B50-\u1B59\u1BB0-\u1BB9\u1C40-\u1C49\u1C50-\u1C59\u2070\u2074-\u2079\u2080-\u2089\u2150-\u2182\u2185-\u2189\u2460-\u249B\u24EA-\u24FF\u2776-\u2793\u2CFD\u3007\u3021-\u3029\u3038-\u303A\u3192-\u3195\u3220-\u3229\u3248-\u324F\u3251-\u325F\u3280-\u3289\u32B1-\u32BF\uA620-\uA629\uA6E6-\uA6EF\uA830-\uA835\uA8D0-\uA8D9\uA900-\uA909\uA9D0-\uA9D9\uAA50-\uAA59\uABF0-\uABF9\uFF10-\uFF19"; // const pN = `[${_pN}]`

    var _pNd = "0-9\u0660-\u0669\u06F0-\u06F9\u07C0-\u07C9\u0966-\u096F\u09E6-\u09EF\u0A66-\u0A6F\u0AE6-\u0AEF\u0B66-\u0B6F\u0BE6-\u0BEF\u0C66-\u0C6F\u0CE6-\u0CEF\u0D66-\u0D6F\u0E50-\u0E59\u0ED0-\u0ED9\u0F20-\u0F29\u1040-\u1049\u1090-\u1099\u17E0-\u17E9\u1810-\u1819\u1946-\u194F\u19D0-\u19D9\u1A80-\u1A89\u1A90-\u1A99\u1B50-\u1B59\u1BB0-\u1BB9\u1C40-\u1C49\u1C50-\u1C59\uA620-\uA629\uA8D0-\uA8D9\uA900-\uA909\uA9D0-\uA9D9\uAA50-\uAA59\uABF0-\uABF9\uFF10-\uFF19";
    var pNd = "[".concat(_pNd, "]");
    var _pL = "A-Za-z\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u0527\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u08A0\u08A2-\u08AC\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0977\u0979-\u097F\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C33\u0C35-\u0C39\u0C3D\u0C58\u0C59\u0C60\u0C61\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D60\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F4\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191C\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19C1-\u19C7\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2183\u2184\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005\u3006\u3031-\u3035\u303B\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312D\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FCC\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA697\uA6A0-\uA6E5\uA717-\uA71F\uA722-\uA788\uA78B-\uA78E\uA790-\uA793\uA7A0-\uA7AA\uA7F8-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA80-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uABC0-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC";
    var pL = "[".concat(_pL, "]");
    var pL_regexp = new RegExp(pL);
    var _pSc = "$\xA2-\xA5\u058F\u060B\u09F2\u09F3\u09FB\u0AF1\u0BF9\u0E3F\u17DB\u20A0-\u20B9\uA838\uFDFC\uFE69\uFF04\uFFE0\uFFE1\uFFE5\uFFE6";
    var pSc = "[".concat(_pSc, "]");
    var pSc_regexp = new RegExp(pSc);
    var _pMn = "\u0300-\u036F\u0483-\u0487\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u0711\u0730-\u074A\u07A6-\u07B0\u07EB-\u07F3\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0859-\u085B\u08E4-\u08FE\u0900-\u0902\u093A\u093C\u0941-\u0948\u094D\u0951-\u0957\u0962\u0963\u0981\u09BC\u09C1-\u09C4\u09CD\u09E2\u09E3\u0A01\u0A02\u0A3C\u0A41\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A70\u0A71\u0A75\u0A81\u0A82\u0ABC\u0AC1-\u0AC5\u0AC7\u0AC8\u0ACD\u0AE2\u0AE3\u0B01\u0B3C\u0B3F\u0B41-\u0B44\u0B4D\u0B56\u0B62\u0B63\u0B82\u0BC0\u0BCD\u0C3E-\u0C40\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C62\u0C63\u0CBC\u0CBF\u0CC6\u0CCC\u0CCD\u0CE2\u0CE3\u0D41-\u0D44\u0D4D\u0D62\u0D63\u0DCA\u0DD2-\u0DD4\u0DD6\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0EB1\u0EB4-\u0EB9\u0EBB\u0EBC\u0EC8-\u0ECD\u0F18\u0F19\u0F35\u0F37\u0F39\u0F71-\u0F7E\u0F80-\u0F84\u0F86\u0F87\u0F8D-\u0F97\u0F99-\u0FBC\u0FC6\u102D-\u1030\u1032-\u1037\u1039\u103A\u103D\u103E\u1058\u1059\u105E-\u1060\u1071-\u1074\u1082\u1085\u1086\u108D\u109D\u135D-\u135F\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17B4\u17B5\u17B7-\u17BD\u17C6\u17C9-\u17D3\u17DD\u180B-\u180D\u18A9\u1920-\u1922\u1927\u1928\u1932\u1939-\u193B\u1A17\u1A18\u1A56\u1A58-\u1A5E\u1A60\u1A62\u1A65-\u1A6C\u1A73-\u1A7C\u1A7F\u1B00-\u1B03\u1B34\u1B36-\u1B3A\u1B3C\u1B42\u1B6B-\u1B73\u1B80\u1B81\u1BA2-\u1BA5\u1BA8\u1BA9\u1BAB\u1BE6\u1BE8\u1BE9\u1BED\u1BEF-\u1BF1\u1C2C-\u1C33\u1C36\u1C37\u1CD0-\u1CD2\u1CD4-\u1CE0\u1CE2-\u1CE8\u1CED\u1CF4\u1DC0-\u1DE6\u1DFC-\u1DFF\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2CEF-\u2CF1\u2D7F\u2DE0-\u2DFF\u302A-\u302D\u3099\u309A\uA66F\uA674-\uA67D\uA69F\uA6F0\uA6F1\uA802\uA806\uA80B\uA825\uA826\uA8C4\uA8E0-\uA8F1\uA926-\uA92D\uA947-\uA951\uA980-\uA982\uA9B3\uA9B6-\uA9B9\uA9BC\uAA29-\uAA2E\uAA31\uAA32\uAA35\uAA36\uAA43\uAA4C\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uAAEC\uAAED\uAAF6\uABE5\uABE8\uABED\uFB1E\uFE00-\uFE0F\uFE20-\uFE26";
    var pMn = "[".concat(_pMn, "]");
    var pMn_regexp = new RegExp(pMn);
    var _InBasic_Latin = "\0-\x7F";
    var _InLatin_1_Supplement = "\x80-\xFF";
    var _InLatin_Extended_A = "\u0100-\u017F";
    var _InLatin_Extended_Additional = "\u1E00-\u1EFF";
    var _InLatin_Extended_B = "\u0180-\u024F";
    var _InCombining_Diacritical_Marks = "\u0300-\u036F";
    var latinLetterRegexp = new RegExp('[' + _InBasic_Latin + _InLatin_1_Supplement + _InLatin_Extended_A + _InLatin_Extended_Additional + _InLatin_Extended_B + _InCombining_Diacritical_Marks + ']');
    /**
     * Helper method to determine if a character is a Latin-script letter or not.
     * For our purposes, combining marks should also return true since we assume
     * they have been added to a preceding Latin character.
     */

    function isLatinLetter(letter) {
      // Combining marks are a subset of non-spacing-mark.
      if (!pL_regexp.test(letter) && !pMn_regexp.test(letter)) {
        return false;
      }

      return latinLetterRegexp.test(letter);
    }
    function isInvalidPunctuationSymbol(character) {
      return character === '%' || pSc_regexp.test(character);
    }

    function _createForOfIteratorHelperLoose$4(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray$6(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

    function _unsupportedIterableToArray$6(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray$6(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$6(o, minLen); }

    function _arrayLikeToArray$6(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }
    /**
     * Leniency when finding potential phone numbers in text segments
     * The levels here are ordered in increasing strictness.
     */

    var Leniency = {
      /**
       * Phone numbers accepted are "possible", but not necessarily "valid".
       */
      POSSIBLE: function POSSIBLE(number, candidate, metadata) {
        return true;
      },

      /**
       * Phone numbers accepted are "possible" and "valid".
       * Numbers written in national format must have their national-prefix
       * present if it is usually written for a number of this type.
       */
      VALID: function VALID(number, candidate, metadata) {
        if (!isValidNumber(number, undefined, metadata) || !containsOnlyValidXChars(number, candidate.toString())) {
          return false;
        } // Skipped for simplicity.
        // return isNationalPrefixPresentIfRequired(number, metadata)


        return true;
      },

      /**
       * Phone numbers accepted are "valid" and
       * are grouped in a possible way for this locale. For example, a US number written as
       * "65 02 53 00 00" and "650253 0000" are not accepted at this leniency level, whereas
       * "650 253 0000", "650 2530000" or "6502530000" are.
       * Numbers with more than one '/' symbol in the national significant number
       * are also dropped at this level.
       *
       * Warning: This level might result in lower coverage especially for regions outside of
       * country code "+1". If you are not sure about which level to use,
       * email the discussion group libphonenumber-discuss@googlegroups.com.
       */
      STRICT_GROUPING: function STRICT_GROUPING(number, candidate, metadata, regExpCache) {
        var candidateString = candidate.toString();

        if (!isValidNumber(number, undefined, metadata) || !containsOnlyValidXChars(number, candidateString) || containsMoreThanOneSlashInNationalNumber(number, candidateString) || !isNationalPrefixPresentIfRequired(number)) {
          return false;
        }

        return checkNumberGroupingIsValid(number, candidate, metadata, allNumberGroupsRemainGrouped, regExpCache);
      },

      /**
       * Phone numbers accepted are {@linkplain PhoneNumberUtil#isValidNumber(PhoneNumber) valid} and
       * are grouped in the same way that we would have formatted it, or as a single block. For
       * example, a US number written as "650 2530000" is not accepted at this leniency level, whereas
       * "650 253 0000" or "6502530000" are.
       * Numbers with more than one '/' symbol are also dropped at this level.
       * <p>
       * Warning: This level might result in lower coverage especially for regions outside of country
       * code "+1". If you are not sure about which level to use, email the discussion group
       * libphonenumber-discuss@googlegroups.com.
       */
      EXACT_GROUPING: function EXACT_GROUPING(number, candidate, metadata, regExpCache) {
        var candidateString = candidate.toString();

        if (!isValidNumber(number, undefined, metadata) || !containsOnlyValidXChars(number, candidateString) || containsMoreThanOneSlashInNationalNumber(number, candidateString) || !isNationalPrefixPresentIfRequired(number)) {
          return false;
        }

        return checkNumberGroupingIsValid(number, candidate, metadata, allNumberGroupsAreExactlyPresent, regExpCache);
      }
    };

    function containsOnlyValidXChars(number, candidate, metadata) {
      // The characters 'x' and 'X' can be (1) a carrier code, in which case they always precede the
      // national significant number or (2) an extension sign, in which case they always precede the
      // extension number. We assume a carrier code is more than 1 digit, so the first case has to
      // have more than 1 consecutive 'x' or 'X', whereas the second case can only have exactly 1 'x'
      // or 'X'. We ignore the character if it appears as the last character of the string.
      for (var index = 0; index < candidate.length - 1; index++) {
        var charAtIndex = candidate.charAt(index);

        if (charAtIndex === 'x' || charAtIndex === 'X') {
          var charAtNextIndex = candidate.charAt(index + 1);

          if (charAtNextIndex === 'x' || charAtNextIndex === 'X') {
            // This is the carrier code case, in which the 'X's always precede the national
            // significant number.
            index++;

            if (util.isNumberMatch(number, candidate.substring(index)) != MatchType.NSN_MATCH) {
              return false;
            } // This is the extension sign case, in which the 'x' or 'X' should always precede the
            // extension number.

          } else if (parseDigits(candidate.substring(index)) !== number.ext) {
            return false;
          }
        }
      }

      return true;
    }

    function isNationalPrefixPresentIfRequired(number, _metadata) {
      // First, check how we deduced the country code. If it was written in international format, then
      // the national prefix is not required.
      if (number.getCountryCodeSource() != 'FROM_DEFAULT_COUNTRY') {
        return true;
      }

      var phoneNumberRegion = util.getRegionCodeForCountryCode(number.getCountryCode());
      var metadata = util.getMetadataForRegion(phoneNumberRegion);

      if (metadata == null) {
        return true;
      } // Check if a national prefix should be present when formatting this number.


      var nationalNumber = util.getNationalSignificantNumber(number);
      var formatRule = util.chooseFormattingPatternForNumber(metadata.numberFormats(), nationalNumber); // To do this, we check that a national prefix formatting rule was present
      // and that it wasn't just the first-group symbol ($1) with punctuation.

      if (formatRule && formatRule.getNationalPrefixFormattingRule().length > 0) {
        if (formatRule.getNationalPrefixOptionalWhenFormatting()) {
          // The national-prefix is optional in these cases, so we don't need to check if it was
          // present.
          return true;
        }

        if (PhoneNumberUtil.formattingRuleHasFirstGroupOnly(formatRule.getNationalPrefixFormattingRule())) {
          // National Prefix not needed for this number.
          return true;
        } // Normalize the remainder.


        var rawInputCopy = PhoneNumberUtil.normalizeDigitsOnly(number.getRawInput()); // Check if we found a national prefix and/or carrier code at the start of the raw input, and
        // return the result.

        return util.maybeStripNationalPrefixAndCarrierCode(rawInputCopy, metadata, null);
      }

      return true;
    }

    function containsMoreThanOneSlashInNationalNumber(number, candidate) {
      var firstSlashInBodyIndex = candidate.indexOf('/');

      if (firstSlashInBodyIndex < 0) {
        // No slashes, this is okay.
        return false;
      } // Now look for a second one.


      var secondSlashInBodyIndex = candidate.indexOf('/', firstSlashInBodyIndex + 1);

      if (secondSlashInBodyIndex < 0) {
        // Only one slash, this is okay.
        return false;
      } // If the first slash is after the country calling code, this is permitted.


      var candidateHasCountryCode = number.getCountryCodeSource() === CountryCodeSource.FROM_NUMBER_WITH_PLUS_SIGN || number.getCountryCodeSource() === CountryCodeSource.FROM_NUMBER_WITHOUT_PLUS_SIGN;

      if (candidateHasCountryCode && PhoneNumberUtil.normalizeDigitsOnly(candidate.substring(0, firstSlashInBodyIndex)) === String(number.getCountryCode())) {
        // Any more slashes and this is illegal.
        return candidate.slice(secondSlashInBodyIndex + 1).indexOf('/') >= 0;
      }

      return true;
    }

    function checkNumberGroupingIsValid(number, candidate, metadata, checkGroups, regExpCache) {
      var normalizedCandidate = normalizeDigits(candidate, true
      /* keep non-digits */
      );
      var formattedNumberGroups = getNationalNumberGroups(metadata, number, null);

      if (checkGroups(metadata, number, normalizedCandidate, formattedNumberGroups)) {
        return true;
      } // If this didn't pass, see if there are any alternate formats that match, and try them instead.


      var alternateFormats = MetadataManager.getAlternateFormatsForCountry(number.getCountryCode());
      var nationalSignificantNumber = util.getNationalSignificantNumber(number);

      if (alternateFormats) {
        for (var _iterator = _createForOfIteratorHelperLoose$4(alternateFormats.numberFormats()), _step; !(_step = _iterator()).done;) {
          var alternateFormat = _step.value;

          if (alternateFormat.leadingDigitsPatterns().length > 0) {
            // There is only one leading digits pattern for alternate formats.
            var leadingDigitsRegExp = regExpCache.getPatternForRegExp('^' + alternateFormat.leadingDigitsPatterns()[0]);

            if (!leadingDigitsRegExp.test(nationalSignificantNumber)) {
              // Leading digits don't match; try another one.
              continue;
            }
          }

          formattedNumberGroups = getNationalNumberGroups(metadata, number, alternateFormat);

          if (checkGroups(metadata, number, normalizedCandidate, formattedNumberGroups)) {
            return true;
          }
        }
      }

      return false;
    }
    /**
     * Helper method to get the national-number part of a number, formatted without any national
     * prefix, and return it as a set of digit blocks that would be formatted together following
     * standard formatting rules.
     */


    function getNationalNumberGroups(metadata, number, formattingPattern) {
      if (formattingPattern) {
        // We format the NSN only, and split that according to the separator.
        var nationalSignificantNumber = util.getNationalSignificantNumber(number);
        return util.formatNsnUsingPattern(nationalSignificantNumber, formattingPattern, 'RFC3966', metadata).split('-');
      } // This will be in the format +CC-DG1-DG2-DGX;ext=EXT where DG1..DGX represents groups of digits.


      var rfc3966Format = formatNumber(number, 'RFC3966', metadata); // We remove the extension part from the formatted string before splitting it into different
      // groups.

      var endIndex = rfc3966Format.indexOf(';');

      if (endIndex < 0) {
        endIndex = rfc3966Format.length;
      } // The country-code will have a '-' following it.


      var startIndex = rfc3966Format.indexOf('-') + 1;
      return rfc3966Format.slice(startIndex, endIndex).split('-');
    }

    function allNumberGroupsAreExactlyPresent(metadata, number, normalizedCandidate, formattedNumberGroups) {
      var candidateGroups = normalizedCandidate.split(NON_DIGITS_PATTERN); // Set this to the last group, skipping it if the number has an extension.

      var candidateNumberGroupIndex = number.hasExtension() ? candidateGroups.length - 2 : candidateGroups.length - 1; // First we check if the national significant number is formatted as a block.
      // We use contains and not equals, since the national significant number may be present with
      // a prefix such as a national number prefix, or the country code itself.

      if (candidateGroups.length == 1 || candidateGroups[candidateNumberGroupIndex].contains(util.getNationalSignificantNumber(number))) {
        return true;
      } // Starting from the end, go through in reverse, excluding the first group, and check the
      // candidate and number groups are the same.


      var formattedNumberGroupIndex = formattedNumberGroups.length - 1;

      while (formattedNumberGroupIndex > 0 && candidateNumberGroupIndex >= 0) {
        if (candidateGroups[candidateNumberGroupIndex] !== formattedNumberGroups[formattedNumberGroupIndex]) {
          return false;
        }

        formattedNumberGroupIndex--;
        candidateNumberGroupIndex--;
      } // Now check the first group. There may be a national prefix at the start, so we only check
      // that the candidate group ends with the formatted number group.


      return candidateNumberGroupIndex >= 0 && endsWith(candidateGroups[candidateNumberGroupIndex], formattedNumberGroups[0]);
    }

    function allNumberGroupsRemainGrouped(metadata, number, normalizedCandidate, formattedNumberGroups) {
      var fromIndex = 0;

      if (number.getCountryCodeSource() !== CountryCodeSource.FROM_DEFAULT_COUNTRY) {
        // First skip the country code if the normalized candidate contained it.
        var countryCode = String(number.getCountryCode());
        fromIndex = normalizedCandidate.indexOf(countryCode) + countryCode.length();
      } // Check each group of consecutive digits are not broken into separate groupings in the
      // {@code normalizedCandidate} string.


      for (var i = 0; i < formattedNumberGroups.length; i++) {
        // Fails if the substring of {@code normalizedCandidate} starting from {@code fromIndex}
        // doesn't contain the consecutive digits in formattedNumberGroups[i].
        fromIndex = normalizedCandidate.indexOf(formattedNumberGroups[i], fromIndex);

        if (fromIndex < 0) {
          return false;
        } // Moves {@code fromIndex} forward.


        fromIndex += formattedNumberGroups[i].length();

        if (i == 0 && fromIndex < normalizedCandidate.length()) {
          // We are at the position right after the NDC. We get the region used for formatting
          // information based on the country code in the phone number, rather than the number itself,
          // as we do not need to distinguish between different countries with the same country
          // calling code and this is faster.
          var region = util.getRegionCodeForCountryCode(number.getCountryCode());

          if (util.getNddPrefixForRegion(region, true) != null && Character.isDigit(normalizedCandidate.charAt(fromIndex))) {
            // This means there is no formatting symbol after the NDC. In this case, we only
            // accept the number if there is no formatting symbol at all in the number, except
            // for extensions. This is only important for countries with national prefixes.
            var nationalSignificantNumber = util.getNationalSignificantNumber(number);
            return startsWith(normalizedCandidate.slice(fromIndex - formattedNumberGroups[i].length), nationalSignificantNumber);
          }
        }
      } // The check here makes sure that we haven't mistakenly already used the extension to
      // match the last group of the subscriber number. Note the extension cannot have
      // formatting in-between digits.


      return normalizedCandidate.slice(fromIndex).contains(number.getExtension());
    }

    // of parsing. This allows us to strip off parts of the number that are actually the start of
    // another number, such as for: (530) 583-6985 x302/x2303 -> the second extension here makes this
    // actually two phone numbers, (530) 583-6985 x302 and (530) 583-6985 x2303. We remove the second
    // extension so that the first number is parsed correctly.
    //
    // Matches a slash (\ or /) followed by a space followed by an `x`.
    //

    var SECOND_NUMBER_START_PATTERN = /[\\/] *x/;
    function parsePreCandidate(candidate) {
      // Check for extra numbers at the end.
      // TODO: This is the place to start when trying to support extraction of multiple phone number
      // from split notations (+41 79 123 45 67 / 68).
      return trimAfterFirstMatch(SECOND_NUMBER_START_PATTERN, candidate);
    }

    // Matches strings that look like dates using "/" as a separator.
    // Examples: 3/10/2011, 31/10/96 or 08/31/95.
    var SLASH_SEPARATED_DATES = /(?:(?:[0-3]?\d\/[01]?\d)|(?:[01]?\d\/[0-3]?\d))\/(?:[12]\d)?\d{2}/; // Matches timestamps.
    // Examples: "2012-01-02 08:00".
    // Note that the reg-ex does not include the
    // trailing ":\d\d" -- that is covered by TIME_STAMPS_SUFFIX.

    var TIME_STAMPS = /[12]\d{3}[-/]?[01]\d[-/]?[0-3]\d +[0-2]\d$/;
    var TIME_STAMPS_SUFFIX_LEADING = /^:[0-5]\d/;
    function isValidPreCandidate(candidate, offset, text) {
      // Skip a match that is more likely to be a date.
      if (SLASH_SEPARATED_DATES.test(candidate)) {
        return false;
      } // Skip potential time-stamps.


      if (TIME_STAMPS.test(candidate)) {
        var followingText = text.slice(offset + candidate.length);

        if (TIME_STAMPS_SUFFIX_LEADING.test(followingText)) {
          return false;
        }
      }

      return true;
    }

    // Copy-pasted from `PhoneNumberMatcher.js`.
    var OPENING_PARENS = "(\\[\uFF08\uFF3B";
    var CLOSING_PARENS = ")\\]\uFF09\uFF3D";
    var NON_PARENS = "[^".concat(OPENING_PARENS).concat(CLOSING_PARENS, "]");
    var LEAD_CLASS = "[".concat(OPENING_PARENS).concat(PLUS_CHARS, "]"); // Punctuation that may be at the start of a phone number - brackets and plus signs.

    var LEAD_CLASS_LEADING = new RegExp('^' + LEAD_CLASS); // Limit on the number of pairs of brackets in a phone number.

    var BRACKET_PAIR_LIMIT = limit(0, 3);
    /**
     * Pattern to check that brackets match. Opening brackets should be closed within a phone number.
     * This also checks that there is something inside the brackets. Having no brackets at all is also
     * fine.
     *
     * An opening bracket at the beginning may not be closed, but subsequent ones should be.  It's
     * also possible that the leading bracket was dropped, so we shouldn't be surprised if we see a
     * closing bracket first. We limit the sets of brackets in a phone number to four.
     */

    var MATCHING_BRACKETS_ENTIRE = new RegExp('^' + "(?:[" + OPENING_PARENS + "])?" + "(?:" + NON_PARENS + "+" + "[" + CLOSING_PARENS + "])?" + NON_PARENS + "+" + "(?:[" + OPENING_PARENS + "]" + NON_PARENS + "+[" + CLOSING_PARENS + "])" + BRACKET_PAIR_LIMIT + NON_PARENS + "*" + '$');
    /**
     * Matches strings that look like publication pages. Example:
     * <pre>Computing Complete Answers to Queries in the Presence of Limited Access Patterns.
     * Chen Li. VLDB J. 12(3): 211-227 (2003).</pre>
     *
     * The string "211-227 (2003)" is not a telephone number.
     */

    var PUB_PAGES = /\d{1,5}-+\d{1,5}\s{0,4}\(\d{1,4}/;
    function isValidCandidate(candidate, offset, text, leniency) {
      // Check the candidate doesn't contain any formatting
      // which would indicate that it really isn't a phone number.
      if (!MATCHING_BRACKETS_ENTIRE.test(candidate) || PUB_PAGES.test(candidate)) {
        return;
      } // If leniency is set to VALID or stricter, we also want to skip numbers that are surrounded
      // by Latin alphabetic characters, to skip cases like abc8005001234 or 8005001234def.


      if (leniency !== 'POSSIBLE') {
        // If the candidate is not at the start of the text,
        // and does not start with phone-number punctuation,
        // check the previous character.
        if (offset > 0 && !LEAD_CLASS_LEADING.test(candidate)) {
          var previousChar = text[offset - 1]; // We return null if it is a latin letter or an invalid punctuation symbol.

          if (isInvalidPunctuationSymbol(previousChar) || isLatinLetter(previousChar)) {
            return false;
          }
        }

        var lastCharIndex = offset + candidate.length;

        if (lastCharIndex < text.length) {
          var nextChar = text[lastCharIndex];

          if (isInvalidPunctuationSymbol(nextChar) || isLatinLetter(nextChar)) {
            return false;
          }
        }
      }

      return true;
    }

    function _createForOfIteratorHelperLoose$3(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray$5(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

    function _unsupportedIterableToArray$5(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray$5(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$5(o, minLen); }

    function _arrayLikeToArray$5(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

    function ownKeys$1(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

    function _objectSpread$1(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys$1(Object(source), !0).forEach(function (key) { _defineProperty$1(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys$1(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

    function _defineProperty$1(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

    function _classCallCheck$6(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _defineProperties$6(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

    function _createClass$6(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties$6(Constructor.prototype, protoProps); if (staticProps) _defineProperties$6(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
    var EXTN_PATTERNS_FOR_MATCHING = createExtensionPattern();
    /**
     * Patterns used to extract phone numbers from a larger phone-number-like pattern. These are
     * ordered according to specificity. For example, white-space is last since that is frequently
     * used in numbers, not just to separate two numbers. We have separate patterns since we don't
     * want to break up the phone-number-like text on more than one different kind of symbol at one
     * time, although symbols of the same type (e.g. space) can be safely grouped together.
     *
     * Note that if there is a match, we will always check any text found up to the first match as
     * well.
     */

    var INNER_MATCHES = [// Breaks on the slash - e.g. "651-234-2345/332-445-1234"
    '\\/+(.*)/', // Note that the bracket here is inside the capturing group, since we consider it part of the
    // phone number. Will match a pattern like "(650) 223 3345 (754) 223 3321".
    '(\\([^(]*)', // Breaks on a hyphen - e.g. "12345 - 332-445-1234 is my number."
    // We require a space on either side of the hyphen for it to be considered a separator.
    "(?:".concat(pZ, "-|-").concat(pZ, ")").concat(pZ, "*(.+)"), // Various types of wide hyphens. Note we have decided not to enforce a space here, since it's
    // possible that it's supposed to be used to break two numbers without spaces, and we haven't
    // seen many instances of it used within a number.
    "[\u2012-\u2015\uFF0D]".concat(pZ, "*(.+)"), // Breaks on a full stop - e.g. "12345. 332-445-1234 is my number."
    "\\.+".concat(pZ, "*([^.]+)"), // Breaks on space - e.g. "3324451234 8002341234"
    "".concat(pZ, "+(").concat(PZ, "+)")]; // Limit on the number of leading (plus) characters.

    var leadLimit = limit(0, 2); // Limit on the number of consecutive punctuation characters.

    var punctuationLimit = limit(0, 4);
    /* The maximum number of digits allowed in a digit-separated block. As we allow all digits in a
     * single block, set high enough to accommodate the entire national number and the international
     * country code. */

    var digitBlockLimit = MAX_LENGTH_FOR_NSN + MAX_LENGTH_COUNTRY_CODE; // Limit on the number of blocks separated by punctuation.
    // Uses digitBlockLimit since some formats use spaces to separate each digit.

    var blockLimit = limit(0, digitBlockLimit);
    /* A punctuation sequence allowing white space. */

    var punctuation = "[".concat(VALID_PUNCTUATION, "]") + punctuationLimit; // A digits block without punctuation.

    var digitSequence = pNd + limit(1, digitBlockLimit);
    /**
     * Phone number pattern allowing optional punctuation.
     * The phone number pattern used by `find()`, similar to
     * VALID_PHONE_NUMBER, but with the following differences:
     * <ul>
     *   <li>All captures are limited in order to place an upper bound to the text matched by the
     *       pattern.
     * <ul>
     *   <li>Leading punctuation / plus signs are limited.
     *   <li>Consecutive occurrences of punctuation are limited.
     *   <li>Number of digits is limited.
     * </ul>
     *   <li>No whitespace is allowed at the start or end.
     *   <li>No alpha digits (vanity numbers such as 1-800-SIX-FLAGS) are currently supported.
     * </ul>
     */

    var PATTERN = '(?:' + LEAD_CLASS + punctuation + ')' + leadLimit + digitSequence + '(?:' + punctuation + digitSequence + ')' + blockLimit + '(?:' + EXTN_PATTERNS_FOR_MATCHING + ')?'; // Regular expression of trailing characters that we want to remove.
    // We remove all characters that are not alpha or numerical characters.
    // The hash character is retained here, as it may signify
    // the previous block was an extension.
    //
    // // Don't know what does '&&' mean here.
    // const UNWANTED_END_CHAR_PATTERN = new RegExp(`[[\\P{N}&&\\P{L}]&&[^#]]+$`)
    //

    var UNWANTED_END_CHAR_PATTERN = new RegExp("[^".concat(_pN).concat(_pL, "#]+$"));
    var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || Math.pow(2, 53) - 1;
    /**
     * A stateful class that finds and extracts telephone numbers from {@linkplain CharSequence text}.
     * Instances can be created using the {@linkplain PhoneNumberUtil#findNumbers factory methods} in
     * {@link PhoneNumberUtil}.
     *
     * <p>Vanity numbers (phone numbers using alphabetic digits such as <tt>1-800-SIX-FLAGS</tt> are
     * not found.
     *
     * <p>This class is not thread-safe.
     */

    var PhoneNumberMatcher = /*#__PURE__*/function () {
      /**
       * Creates a new instance. See the factory methods in {@link PhoneNumberUtil} on how to obtain a
       * new instance.
       *
       * @param util  the phone number util to use
       * @param text  the character sequence that we will search, null for no text
       * @param country  the country to assume for phone numbers not written in international format
       *     (with a leading plus, or with the international dialing prefix of the specified region).
       *     May be null or "ZZ" if only numbers with a leading plus should be
       *     considered.
       * @param leniency  the leniency to use when evaluating candidate phone numbers
       * @param maxTries  the maximum number of invalid numbers to try before giving up on the text.
       *     This is to cover degenerate cases where the text has a lot of false positives in it. Must
       *     be {@code >= 0}.
       */
      function PhoneNumberMatcher() {
        var text = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
        var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
        var metadata = arguments.length > 2 ? arguments[2] : undefined;

        _classCallCheck$6(this, PhoneNumberMatcher);

        options = _objectSpread$1(_objectSpread$1({}, options), {}, {
          defaultCallingCode: options.defaultCallingCode,
          defaultCountry: options.defaultCountry && isSupportedCountry(options.defaultCountry, metadata) ? options.defaultCountry : undefined,
          leniency: options.leniency || options.extended ? 'POSSIBLE' : 'VALID',
          maxTries: options.maxTries || MAX_SAFE_INTEGER
        });

        if (!options.leniency) {
          throw new TypeError('`Leniency` not supplied');
        }

        if (options.maxTries < 0) {
          throw new TypeError('`maxTries` not supplied');
        }

        this.text = text;
        this.options = options;
        this.metadata = metadata;
        /** The degree of validation requested. */

        this.leniency = Leniency[options.leniency];

        if (!this.leniency) {
          throw new TypeError("Unknown leniency: ".concat(options.leniency, "."));
        }
        /** The maximum number of retries after matching an invalid number. */


        this.maxTries = options.maxTries;
        this.PATTERN = new RegExp(PATTERN, 'ig');
        /** The iteration tristate. */

        this.state = 'NOT_READY';
        /** The next index to start searching at. Undefined in {@link State#DONE}. */

        this.searchIndex = 0; // A cache for frequently used country-specific regular expressions. Set to 32 to cover ~2-3
        // countries being used for the same doc with ~10 patterns for each country. Some pages will have
        // a lot more countries in use, but typically fewer numbers for each so expanding the cache for
        // that use-case won't have a lot of benefit.

        this.regExpCache = new RegExpCache(32);
      }
      /**
       * Attempts to find the next subsequence in the searched sequence on or after {@code searchIndex}
       * that represents a phone number. Returns the next match, null if none was found.
       *
       * @param index  the search index to start searching at
       * @return  the phone number match found, null if none can be found
       */


      _createClass$6(PhoneNumberMatcher, [{
        key: "find",
        value: function find() {
          // // Reset the regular expression.
          // this.PATTERN.lastIndex = index
          var matches;

          while (this.maxTries > 0 && (matches = this.PATTERN.exec(this.text)) !== null) {
            var candidate = matches[0];
            var offset = matches.index;
            candidate = parsePreCandidate(candidate);

            if (isValidPreCandidate(candidate, offset, this.text)) {
              var match = // Try to come up with a valid match given the entire candidate.
              this.parseAndVerify(candidate, offset, this.text) // If that failed, try to find an "inner match" -
              // there might be a phone number within this candidate.
              || this.extractInnerMatch(candidate, offset, this.text);

              if (match) {
                if (this.options.v2) {
                  var phoneNumber = new PhoneNumber(match.country || match.countryCallingCode, match.phone, this.metadata);

                  if (match.ext) {
                    phoneNumber.ext = match.ext;
                  }

                  return {
                    startsAt: match.startsAt,
                    endsAt: match.endsAt,
                    number: phoneNumber
                  };
                }

                return match;
              }
            }

            this.maxTries--;
          }
        }
        /**
         * Attempts to extract a match from `substring`
         * if the substring itself does not qualify as a match.
         */

      }, {
        key: "extractInnerMatch",
        value: function extractInnerMatch(substring, offset, text) {
          for (var _iterator = _createForOfIteratorHelperLoose$3(INNER_MATCHES), _step; !(_step = _iterator()).done;) {
            var innerMatchPattern = _step.value;
            var isFirstMatch = true;
            var candidateMatch = void 0;
            var innerMatchRegExp = new RegExp(innerMatchPattern, 'g');

            while (this.maxTries > 0 && (candidateMatch = innerMatchRegExp.exec(substring)) !== null) {
              if (isFirstMatch) {
                // We should handle any group before this one too.
                var _candidate = trimAfterFirstMatch(UNWANTED_END_CHAR_PATTERN, substring.slice(0, candidateMatch.index));

                var _match = this.parseAndVerify(_candidate, offset, text);

                if (_match) {
                  return _match;
                }

                this.maxTries--;
                isFirstMatch = false;
              }

              var candidate = trimAfterFirstMatch(UNWANTED_END_CHAR_PATTERN, candidateMatch[1]); // Java code does `groupMatcher.start(1)` here,
              // but there's no way in javascript to get a `candidate` start index,
              // therefore resort to using this kind of an approximation.
              // (`groupMatcher` is called `candidateInSubstringMatch` in this javascript port)
              // https://stackoverflow.com/questions/15934353/get-index-of-each-capture-in-a-javascript-regex

              var candidateIndexGuess = substring.indexOf(candidate, candidateMatch.index);
              var match = this.parseAndVerify(candidate, offset + candidateIndexGuess, text);

              if (match) {
                return match;
              }

              this.maxTries--;
            }
          }
        }
        /**
         * Parses a phone number from the `candidate` using `parseNumber` and
         * verifies it matches the requested `leniency`. If parsing and verification succeed,
         * a corresponding `PhoneNumberMatch` is returned, otherwise this method returns `null`.
         *
         * @param candidate  the candidate match
         * @param offset  the offset of {@code candidate} within {@link #text}
         * @return  the parsed and validated phone number match, or null
         */

      }, {
        key: "parseAndVerify",
        value: function parseAndVerify(candidate, offset, text) {
          if (!isValidCandidate(candidate, offset, text, this.options.leniency)) {
            return;
          }

          var number = parse(candidate, {
            extended: true,
            defaultCountry: this.options.defaultCountry,
            defaultCallingCode: this.options.defaultCallingCode
          }, this.metadata);

          if (!number.possible) {
            return;
          }

          if (this.leniency(number, candidate, this.metadata, this.regExpCache)) {
            // // We used parseAndKeepRawInput to create this number,
            // // but for now we don't return the extra values parsed.
            // // TODO: stop clearing all values here and switch all users over
            // // to using rawInput() rather than the rawString() of PhoneNumberMatch.
            // number.clearCountryCodeSource()
            // number.clearRawInput()
            // number.clearPreferredDomesticCarrierCode()
            var result = {
              startsAt: offset,
              endsAt: offset + candidate.length,
              phone: number.phone
            };

            if (number.country && number.country !== '001') {
              result.country = number.country;
            } else {
              result.countryCallingCode = number.countryCallingCode;
            }

            if (number.ext) {
              result.ext = number.ext;
            }

            return result;
          }
        }
      }, {
        key: "hasNext",
        value: function hasNext() {
          if (this.state === 'NOT_READY') {
            this.lastMatch = this.find(); // (this.searchIndex)

            if (this.lastMatch) {
              // this.searchIndex = this.lastMatch.endsAt
              this.state = 'READY';
            } else {
              this.state = 'DONE';
            }
          }

          return this.state === 'READY';
        }
      }, {
        key: "next",
        value: function next() {
          // Check the state and find the next match as a side-effect if necessary.
          if (!this.hasNext()) {
            throw new Error('No next element');
          } // Don't retain that memory any longer than necessary.


          var result = this.lastMatch;
          this.lastMatch = null;
          this.state = 'NOT_READY';
          return result;
        }
      }]);

      return PhoneNumberMatcher;
    }();

    function findNumbers$1(text, options, metadata) {
      var matcher = new PhoneNumberMatcher(text, options, metadata);
      var results = [];

      while (matcher.hasNext()) {
        results.push(matcher.next());
      }

      return results;
    }

    function findNumbers() {
      var _normalizeArguments = normalizeArguments(arguments),
          text = _normalizeArguments.text,
          options = _normalizeArguments.options,
          metadata = _normalizeArguments.metadata;

      return findNumbers$1(text, options, metadata);
    }

    function _typeof$1(obj) { "@babel/helpers - typeof"; return _typeof$1 = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof$1(obj); }

    function ownKeys(object, enumerableOnly) { var keys = Object.keys(object); if (Object.getOwnPropertySymbols) { var symbols = Object.getOwnPropertySymbols(object); enumerableOnly && (symbols = symbols.filter(function (sym) { return Object.getOwnPropertyDescriptor(object, sym).enumerable; })), keys.push.apply(keys, symbols); } return keys; }

    function _objectSpread(target) { for (var i = 1; i < arguments.length; i++) { var source = null != arguments[i] ? arguments[i] : {}; i % 2 ? ownKeys(Object(source), !0).forEach(function (key) { _defineProperty(target, key, source[key]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(target, Object.getOwnPropertyDescriptors(source)) : ownKeys(Object(source)).forEach(function (key) { Object.defineProperty(target, key, Object.getOwnPropertyDescriptor(source, key)); }); } return target; }

    function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
    function findPhoneNumbersInText$1(text, defaultCountry, options, metadata) {
      var args = getArguments(defaultCountry, options, metadata);
      return findNumbers(text, args.options, args.metadata);
    }
    function getArguments(defaultCountry, options, metadata) {
      if (metadata) {
        if (defaultCountry) {
          options = _objectSpread(_objectSpread({}, options), {}, {
            defaultCountry: defaultCountry
          });
        }
      } else {
        if (options) {
          metadata = options;

          if (defaultCountry) {
            if (is_object(defaultCountry)) {
              options = defaultCountry;
            } else {
              options = {
                defaultCountry: defaultCountry
              };
            }
          } else {
            options = undefined;
          }
        } else {
          metadata = defaultCountry;
          options = undefined;
        }
      }

      return {
        options: _objectSpread(_objectSpread({}, options), {}, {
          v2: true
        }),
        metadata: metadata
      };
    } // Babel transforms `typeof` into some "branches"
    // so istanbul will show this as "branch not covered".

    /* istanbul ignore next */

    var is_object = function is_object(_) {
      return _typeof$1(_) === 'object';
    };

    function _classCallCheck$5(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _defineProperties$5(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

    function _createClass$5(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties$5(Constructor.prototype, protoProps); if (staticProps) _defineProperties$5(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

    var AsYouTypeState = /*#__PURE__*/function () {
      function AsYouTypeState(_ref) {
        var onCountryChange = _ref.onCountryChange,
            onCallingCodeChange = _ref.onCallingCodeChange;

        _classCallCheck$5(this, AsYouTypeState);

        this.onCountryChange = onCountryChange;
        this.onCallingCodeChange = onCallingCodeChange;
      }

      _createClass$5(AsYouTypeState, [{
        key: "reset",
        value: function reset(defaultCountry, defaultCallingCode) {
          this.international = false;
          this.IDDPrefix = undefined;
          this.missingPlus = undefined;
          this.callingCode = undefined;
          this.digits = '';
          this.resetNationalSignificantNumber();
          this.initCountryAndCallingCode(defaultCountry, defaultCallingCode);
        }
      }, {
        key: "resetNationalSignificantNumber",
        value: function resetNationalSignificantNumber() {
          this.nationalSignificantNumber = this.getNationalDigits();
          this.nationalSignificantNumberMatchesInput = true;
          this.nationalPrefix = undefined;
          this.carrierCode = undefined;
          this.complexPrefixBeforeNationalSignificantNumber = undefined;
        }
      }, {
        key: "update",
        value: function update(properties) {
          for (var _i = 0, _Object$keys = Object.keys(properties); _i < _Object$keys.length; _i++) {
            var key = _Object$keys[_i];
            this[key] = properties[key];
          }
        }
      }, {
        key: "initCountryAndCallingCode",
        value: function initCountryAndCallingCode(country, callingCode) {
          this.setCountry(country);
          this.setCallingCode(callingCode);
        }
      }, {
        key: "setCountry",
        value: function setCountry(country) {
          this.country = country;
          this.onCountryChange(country);
        }
      }, {
        key: "setCallingCode",
        value: function setCallingCode(callingCode) {
          this.callingCode = callingCode;
          return this.onCallingCodeChange(this.country, callingCode);
        }
      }, {
        key: "startInternationalNumber",
        value: function startInternationalNumber() {
          // Prepend the `+` to parsed input.
          this.international = true; // If a default country was set then reset it
          // because an explicitly international phone
          // number is being entered.

          this.initCountryAndCallingCode();
        }
      }, {
        key: "appendDigits",
        value: function appendDigits(nextDigits) {
          this.digits += nextDigits;
        }
      }, {
        key: "appendNationalSignificantNumberDigits",
        value: function appendNationalSignificantNumberDigits(nextDigits) {
          this.nationalSignificantNumber += nextDigits;
        }
        /**
         * Returns the part of `this.digits` that corresponds to the national number.
         * Basically, all digits that have been input by the user, except for the
         * international prefix and the country calling code part
         * (if the number is an international one).
         * @return {string}
         */

      }, {
        key: "getNationalDigits",
        value: function getNationalDigits() {
          if (this.international) {
            return this.digits.slice((this.IDDPrefix ? this.IDDPrefix.length : 0) + (this.callingCode ? this.callingCode.length : 0));
          }

          return this.digits;
        }
      }, {
        key: "getDigitsWithoutInternationalPrefix",
        value: function getDigitsWithoutInternationalPrefix() {
          if (this.international) {
            if (this.IDDPrefix) {
              return this.digits.slice(this.IDDPrefix.length);
            }
          }

          return this.digits;
        }
      }]);

      return AsYouTypeState;
    }();

    function _createForOfIteratorHelperLoose$2(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray$4(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

    function _unsupportedIterableToArray$4(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray$4(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$4(o, minLen); }

    function _arrayLikeToArray$4(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

    // Should be the same as `DIGIT_PLACEHOLDER` in `libphonenumber-metadata-generator`.
    var DIGIT_PLACEHOLDER = 'x'; // '\u2008' (punctuation space)

    var DIGIT_PLACEHOLDER_MATCHER = new RegExp(DIGIT_PLACEHOLDER); // Counts all occurences of a symbol in a string.
    // http://stackoverflow.com/questions/202605/repeat-string-javascript

    function repeat$1(string, times) {
      if (times < 1) {
        return '';
      }

      var result = '';

      while (times > 1) {
        if (times & 1) {
          result += string;
        }

        times >>= 1;
        string += string;
      }

      return result + string;
    }
    function cutAndStripNonPairedParens(string, cutBeforeIndex) {
      if (string[cutBeforeIndex] === ')') {
        cutBeforeIndex++;
      }

      return stripNonPairedParens(string.slice(0, cutBeforeIndex));
    }
    function stripNonPairedParens(string) {
      var dangling_braces = [];
      var i = 0;

      while (i < string.length) {
        if (string[i] === '(') {
          dangling_braces.push(i);
        } else if (string[i] === ')') {
          dangling_braces.pop();
        }

        i++;
      }

      var start = 0;
      var cleared_string = '';
      dangling_braces.push(string.length);

      for (var _i = 0, _dangling_braces = dangling_braces; _i < _dangling_braces.length; _i++) {
        var index = _dangling_braces[_i];
        cleared_string += string.slice(start, index);
        start = index + 1;
      }

      return cleared_string;
    }
    function populateTemplateWithDigits(template, position, digits) {
      // Using `.split('')` to iterate through a string here
      // to avoid requiring `Symbol.iterator` polyfill.
      // `.split('')` is generally not safe for Unicode,
      // but in this particular case for `digits` it is safe.
      // for (const digit of digits)
      for (var _iterator2 = _createForOfIteratorHelperLoose$2(digits.split('')), _step2; !(_step2 = _iterator2()).done;) {
        var digit = _step2.value;

        // If there is room for more digits in current `template`,
        // then set the next digit in the `template`,
        // and return the formatted digits so far.
        // If more digits are entered than the current format could handle.
        if (template.slice(position + 1).search(DIGIT_PLACEHOLDER_MATCHER) < 0) {
          return;
        }

        position = template.search(DIGIT_PLACEHOLDER_MATCHER);
        template = template.replace(DIGIT_PLACEHOLDER_MATCHER, digit);
      }

      return [template, position];
    }

    function formatCompleteNumber(state, format, _ref) {
      var metadata = _ref.metadata,
          shouldTryNationalPrefixFormattingRule = _ref.shouldTryNationalPrefixFormattingRule,
          getSeparatorAfterNationalPrefix = _ref.getSeparatorAfterNationalPrefix;
      var matcher = new RegExp("^(?:".concat(format.pattern(), ")$"));

      if (matcher.test(state.nationalSignificantNumber)) {
        return formatNationalNumberWithAndWithoutNationalPrefixFormattingRule(state, format, {
          metadata: metadata,
          shouldTryNationalPrefixFormattingRule: shouldTryNationalPrefixFormattingRule,
          getSeparatorAfterNationalPrefix: getSeparatorAfterNationalPrefix
        });
      }
    }
    function canFormatCompleteNumber(nationalSignificantNumber, metadata) {
      return checkNumberLength(nationalSignificantNumber, metadata) === 'IS_POSSIBLE';
    }

    function formatNationalNumberWithAndWithoutNationalPrefixFormattingRule(state, format, _ref2) {
      var metadata = _ref2.metadata,
          shouldTryNationalPrefixFormattingRule = _ref2.shouldTryNationalPrefixFormattingRule,
          getSeparatorAfterNationalPrefix = _ref2.getSeparatorAfterNationalPrefix;
      // `format` has already been checked for `nationalPrefix` requirement.
      state.nationalSignificantNumber;
          state.international;
          state.nationalPrefix;
          state.carrierCode; // Format the number with using `national_prefix_formatting_rule`.
      // If the resulting formatted number is a valid formatted number, then return it.
      //
      // Google's AsYouType formatter is different in a way that it doesn't try
      // to format using the "national prefix formatting rule", and instead it
      // simply prepends a national prefix followed by a " " character.
      // This code does that too, but as a fallback.
      // The reason is that "national prefix formatting rule" may use parentheses,
      // which wouldn't be included has it used the simpler Google's way.
      //

      if (shouldTryNationalPrefixFormattingRule(format)) {
        var formattedNumber = formatNationalNumber(state, format, {
          useNationalPrefixFormattingRule: true,
          getSeparatorAfterNationalPrefix: getSeparatorAfterNationalPrefix,
          metadata: metadata
        });

        if (formattedNumber) {
          return formattedNumber;
        }
      } // Format the number without using `national_prefix_formatting_rule`.


      return formatNationalNumber(state, format, {
        useNationalPrefixFormattingRule: false,
        getSeparatorAfterNationalPrefix: getSeparatorAfterNationalPrefix,
        metadata: metadata
      });
    }

    function formatNationalNumber(state, format, _ref3) {
      var metadata = _ref3.metadata,
          useNationalPrefixFormattingRule = _ref3.useNationalPrefixFormattingRule,
          getSeparatorAfterNationalPrefix = _ref3.getSeparatorAfterNationalPrefix;
      var formattedNationalNumber = formatNationalNumberUsingFormat(state.nationalSignificantNumber, format, {
        carrierCode: state.carrierCode,
        useInternationalFormat: state.international,
        withNationalPrefix: useNationalPrefixFormattingRule,
        metadata: metadata
      });

      if (!useNationalPrefixFormattingRule) {
        if (state.nationalPrefix) {
          // If a national prefix was extracted, then just prepend it,
          // followed by a " " character.
          formattedNationalNumber = state.nationalPrefix + getSeparatorAfterNationalPrefix(format) + formattedNationalNumber;
        } else if (state.complexPrefixBeforeNationalSignificantNumber) {
          formattedNationalNumber = state.complexPrefixBeforeNationalSignificantNumber + ' ' + formattedNationalNumber;
        }
      }

      if (isValidFormattedNationalNumber(formattedNationalNumber, state)) {
        return formattedNationalNumber;
      }
    } // Check that the formatted phone number contains exactly
    // the same digits that have been input by the user.
    // For example, when "0111523456789" is input for `AR` country,
    // the extracted `this.nationalSignificantNumber` is "91123456789",
    // which means that the national part of `this.digits` isn't simply equal to
    // `this.nationalPrefix` + `this.nationalSignificantNumber`.
    //
    // Also, a `format` can add extra digits to the `this.nationalSignificantNumber`
    // being formatted via `metadata[country].national_prefix_transform_rule`.
    // For example, for `VI` country, it prepends `340` to the national number,
    // and if this check hasn't been implemented, then there would be a bug
    // when `340` "area coude" is "duplicated" during input for `VI` country:
    // https://github.com/catamphetamine/libphonenumber-js/issues/318
    //
    // So, all these "gotchas" are filtered out.
    //
    // In the original Google's code, the comments say:
    // "Check that we didn't remove nor add any extra digits when we matched
    // this formatting pattern. This usually happens after we entered the last
    // digit during AYTF. Eg: In case of MX, we swallow mobile token (1) when
    // formatted but AYTF should retain all the number entered and not change
    // in order to match a format (of same leading digits and length) display
    // in that way."
    // "If it's the same (i.e entered number and format is same), then it's
    // safe to return this in formatted number as nothing is lost / added."
    // Otherwise, don't use this format.
    // https://github.com/google/libphonenumber/commit/3e7c1f04f5e7200f87fb131e6f85c6e99d60f510#diff-9149457fa9f5d608a11bb975c6ef4bc5
    // https://github.com/google/libphonenumber/commit/3ac88c7106e7dcb553bcc794b15f19185928a1c6#diff-2dcb77e833422ee304da348b905cde0b
    //


    function isValidFormattedNationalNumber(formattedNationalNumber, state) {
      return parseDigits(formattedNationalNumber) === state.getNationalDigits();
    }

    function _classCallCheck$4(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _defineProperties$4(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

    function _createClass$4(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties$4(Constructor.prototype, protoProps); if (staticProps) _defineProperties$4(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

    var PatternParser = /*#__PURE__*/function () {
      function PatternParser() {
        _classCallCheck$4(this, PatternParser);
      }

      _createClass$4(PatternParser, [{
        key: "parse",
        value: function parse(pattern) {
          this.context = [{
            or: true,
            instructions: []
          }];
          this.parsePattern(pattern);

          if (this.context.length !== 1) {
            throw new Error('Non-finalized contexts left when pattern parse ended');
          }

          var _this$context$ = this.context[0],
              branches = _this$context$.branches,
              instructions = _this$context$.instructions;

          if (branches) {
            return {
              op: '|',
              args: branches.concat([expandSingleElementArray(instructions)])
            };
          }
          /* istanbul ignore if */


          if (instructions.length === 0) {
            throw new Error('Pattern is required');
          }

          if (instructions.length === 1) {
            return instructions[0];
          }

          return instructions;
        }
      }, {
        key: "startContext",
        value: function startContext(context) {
          this.context.push(context);
        }
      }, {
        key: "endContext",
        value: function endContext() {
          this.context.pop();
        }
      }, {
        key: "getContext",
        value: function getContext() {
          return this.context[this.context.length - 1];
        }
      }, {
        key: "parsePattern",
        value: function parsePattern(pattern) {
          if (!pattern) {
            throw new Error('Pattern is required');
          }

          var match = pattern.match(OPERATOR);

          if (!match) {
            if (ILLEGAL_CHARACTER_REGEXP.test(pattern)) {
              throw new Error("Illegal characters found in a pattern: ".concat(pattern));
            }

            this.getContext().instructions = this.getContext().instructions.concat(pattern.split(''));
            return;
          }

          var operator = match[1];
          var before = pattern.slice(0, match.index);
          var rightPart = pattern.slice(match.index + operator.length);

          switch (operator) {
            case '(?:':
              if (before) {
                this.parsePattern(before);
              }

              this.startContext({
                or: true,
                instructions: [],
                branches: []
              });
              break;

            case ')':
              if (!this.getContext().or) {
                throw new Error('")" operator must be preceded by "(?:" operator');
              }

              if (before) {
                this.parsePattern(before);
              }

              if (this.getContext().instructions.length === 0) {
                throw new Error('No instructions found after "|" operator in an "or" group');
              }

              var _this$getContext = this.getContext(),
                  branches = _this$getContext.branches;

              branches.push(expandSingleElementArray(this.getContext().instructions));
              this.endContext();
              this.getContext().instructions.push({
                op: '|',
                args: branches
              });
              break;

            case '|':
              if (!this.getContext().or) {
                throw new Error('"|" operator can only be used inside "or" groups');
              }

              if (before) {
                this.parsePattern(before);
              } // The top-level is an implicit "or" group, if required.


              if (!this.getContext().branches) {
                // `branches` are not defined only for the root implicit "or" operator.

                /* istanbul ignore else */
                if (this.context.length === 1) {
                  this.getContext().branches = [];
                } else {
                  throw new Error('"branches" not found in an "or" group context');
                }
              }

              this.getContext().branches.push(expandSingleElementArray(this.getContext().instructions));
              this.getContext().instructions = [];
              break;

            case '[':
              if (before) {
                this.parsePattern(before);
              }

              this.startContext({
                oneOfSet: true
              });
              break;

            case ']':
              if (!this.getContext().oneOfSet) {
                throw new Error('"]" operator must be preceded by "[" operator');
              }

              this.endContext();
              this.getContext().instructions.push({
                op: '[]',
                args: parseOneOfSet(before)
              });
              break;

            /* istanbul ignore next */

            default:
              throw new Error("Unknown operator: ".concat(operator));
          }

          if (rightPart) {
            this.parsePattern(rightPart);
          }
        }
      }]);

      return PatternParser;
    }();

    function parseOneOfSet(pattern) {
      var values = [];
      var i = 0;

      while (i < pattern.length) {
        if (pattern[i] === '-') {
          if (i === 0 || i === pattern.length - 1) {
            throw new Error("Couldn't parse a one-of set pattern: ".concat(pattern));
          }

          var prevValue = pattern[i - 1].charCodeAt(0) + 1;
          var nextValue = pattern[i + 1].charCodeAt(0) - 1;
          var value = prevValue;

          while (value <= nextValue) {
            values.push(String.fromCharCode(value));
            value++;
          }
        } else {
          values.push(pattern[i]);
        }

        i++;
      }

      return values;
    }

    var ILLEGAL_CHARACTER_REGEXP = /[\(\)\[\]\?\:\|]/;
    var OPERATOR = new RegExp( // any of:
    '(' + // or operator
    '\\|' + // or
    '|' + // or group start
    '\\(\\?\\:' + // or
    '|' + // or group end
    '\\)' + // or
    '|' + // one-of set start
    '\\[' + // or
    '|' + // one-of set end
    '\\]' + ')');

    function expandSingleElementArray(array) {
      if (array.length === 1) {
        return array[0];
      }

      return array;
    }

    function _createForOfIteratorHelperLoose$1(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray$3(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

    function _unsupportedIterableToArray$3(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray$3(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$3(o, minLen); }

    function _arrayLikeToArray$3(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

    function _classCallCheck$3(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _defineProperties$3(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

    function _createClass$3(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties$3(Constructor.prototype, protoProps); if (staticProps) _defineProperties$3(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

    var PatternMatcher = /*#__PURE__*/function () {
      function PatternMatcher(pattern) {
        _classCallCheck$3(this, PatternMatcher);

        this.matchTree = new PatternParser().parse(pattern);
      }

      _createClass$3(PatternMatcher, [{
        key: "match",
        value: function match(string) {
          var _ref = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {},
              allowOverflow = _ref.allowOverflow;

          if (!string) {
            throw new Error('String is required');
          }

          var result = _match(string.split(''), this.matchTree, true);

          if (result && result.match) {
            delete result.matchedChars;
          }

          if (result && result.overflow) {
            if (!allowOverflow) {
              return;
            }
          }

          return result;
        }
      }]);

      return PatternMatcher;
    }();

    function _match(characters, tree, last) {
      // If `tree` is a string, then `tree` is a single character.
      // That's because when a pattern is parsed, multi-character-string parts
      // of a pattern are compiled into arrays of single characters.
      // I still wrote this piece of code for a "general" hypothetical case
      // when `tree` could be a string of several characters, even though
      // such case is not possible with the current implementation.
      if (typeof tree === 'string') {
        var characterString = characters.join('');

        if (tree.indexOf(characterString) === 0) {
          // `tree` is always a single character.
          // If `tree.indexOf(characterString) === 0`
          // then `characters.length === tree.length`.

          /* istanbul ignore else */
          if (characters.length === tree.length) {
            return {
              match: true,
              matchedChars: characters
            };
          } // `tree` is always a single character.
          // If `tree.indexOf(characterString) === 0`
          // then `characters.length === tree.length`.

          /* istanbul ignore next */


          return {
            partialMatch: true // matchedChars: characters

          };
        }

        if (characterString.indexOf(tree) === 0) {
          if (last) {
            // The `else` path is not possible because `tree` is always a single character.
            // The `else` case for `characters.length > tree.length` would be
            // `characters.length <= tree.length` which means `characters.length <= 1`.
            // `characters` array can't be empty, so that means `characters === [tree]`,
            // which would also mean `tree.indexOf(characterString) === 0` and that'd mean
            // that the `if (tree.indexOf(characterString) === 0)` condition before this
            // `if` condition would be entered, and returned from there, not reaching this code.

            /* istanbul ignore else */
            if (characters.length > tree.length) {
              return {
                overflow: true
              };
            }
          }

          return {
            match: true,
            matchedChars: characters.slice(0, tree.length)
          };
        }

        return;
      }

      if (Array.isArray(tree)) {
        var restCharacters = characters.slice();
        var i = 0;

        while (i < tree.length) {
          var subtree = tree[i];

          var result = _match(restCharacters, subtree, last && i === tree.length - 1);

          if (!result) {
            return;
          } else if (result.overflow) {
            return result;
          } else if (result.match) {
            // Continue with the next subtree with the rest of the characters.
            restCharacters = restCharacters.slice(result.matchedChars.length);

            if (restCharacters.length === 0) {
              if (i === tree.length - 1) {
                return {
                  match: true,
                  matchedChars: characters
                };
              } else {
                return {
                  partialMatch: true // matchedChars: characters

                };
              }
            }
          } else {
            /* istanbul ignore else */
            if (result.partialMatch) {
              return {
                partialMatch: true // matchedChars: characters

              };
            } else {
              throw new Error("Unsupported match result:\n".concat(JSON.stringify(result, null, 2)));
            }
          }

          i++;
        } // If `last` then overflow has already been checked
        // by the last element of the `tree` array.

        /* istanbul ignore if */


        if (last) {
          return {
            overflow: true
          };
        }

        return {
          match: true,
          matchedChars: characters.slice(0, characters.length - restCharacters.length)
        };
      }

      switch (tree.op) {
        case '|':
          var partialMatch;

          for (var _iterator = _createForOfIteratorHelperLoose$1(tree.args), _step; !(_step = _iterator()).done;) {
            var branch = _step.value;

            var _result = _match(characters, branch, last);

            if (_result) {
              if (_result.overflow) {
                return _result;
              } else if (_result.match) {
                return {
                  match: true,
                  matchedChars: _result.matchedChars
                };
              } else {
                /* istanbul ignore else */
                if (_result.partialMatch) {
                  partialMatch = true;
                } else {
                  throw new Error("Unsupported match result:\n".concat(JSON.stringify(_result, null, 2)));
                }
              }
            }
          }

          if (partialMatch) {
            return {
              partialMatch: true // matchedChars: ...

            };
          } // Not even a partial match.


          return;

        case '[]':
          for (var _iterator2 = _createForOfIteratorHelperLoose$1(tree.args), _step2; !(_step2 = _iterator2()).done;) {
            var _char = _step2.value;

            if (characters[0] === _char) {
              if (characters.length === 1) {
                return {
                  match: true,
                  matchedChars: characters
                };
              }

              if (last) {
                return {
                  overflow: true
                };
              }

              return {
                match: true,
                matchedChars: [_char]
              };
            }
          } // No character matches.


          return;

        /* istanbul ignore next */

        default:
          throw new Error("Unsupported instruction tree: ".concat(tree));
      }
    }

    function _createForOfIteratorHelperLoose(o, allowArrayLike) { var it = typeof Symbol !== "undefined" && o[Symbol.iterator] || o["@@iterator"]; if (it) return (it = it.call(o)).next.bind(it); if (Array.isArray(o) || (it = _unsupportedIterableToArray$2(o)) || allowArrayLike && o && typeof o.length === "number") { if (it) o = it; var i = 0; return function () { if (i >= o.length) return { done: true }; return { done: false, value: o[i++] }; }; } throw new TypeError("Invalid attempt to iterate non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

    function _unsupportedIterableToArray$2(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray$2(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$2(o, minLen); }

    function _arrayLikeToArray$2(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

    function _classCallCheck$2(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _defineProperties$2(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

    function _createClass$2(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties$2(Constructor.prototype, protoProps); if (staticProps) _defineProperties$2(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
    // Could be any digit, I guess.

    var DUMMY_DIGIT = '9'; // I don't know why is it exactly `15`

    var LONGEST_NATIONAL_PHONE_NUMBER_LENGTH = 15; // Create a phone number consisting only of the digit 9 that matches the
    // `number_pattern` by applying the pattern to the "longest phone number" string.

    var LONGEST_DUMMY_PHONE_NUMBER = repeat$1(DUMMY_DIGIT, LONGEST_NATIONAL_PHONE_NUMBER_LENGTH); // A set of characters that, if found in a national prefix formatting rules, are an indicator to
    // us that we should separate the national prefix from the number when formatting.

    var NATIONAL_PREFIX_SEPARATORS_PATTERN = /[- ]/; // Deprecated: Google has removed some formatting pattern related code from their repo.
    // An example of a character class is "[1-4]".

    var CREATE_CHARACTER_CLASS_PATTERN = function () {
      return /\[([^\[\]])*\]/g;
    }; // Any digit in a regular expression that actually denotes a digit. For
    // example, in the regular expression "80[0-2]\d{6,10}", the first 2 digits
    // (8 and 0) are standalone digits, but the rest are not.
    // Two look-aheads are needed because the number following \\d could be a
    // two-digit number, since the phone number can be as long as 15 digits.


    var CREATE_STANDALONE_DIGIT_PATTERN = function () {
      return /\d(?=[^,}][^,}])/g;
    }; // A regular expression that is used to determine if a `format` is
    // suitable to be used in the "as you type formatter".
    // A `format` is suitable when the resulting formatted number has
    // the same digits as the user has entered.
    //
    // In the simplest case, that would mean that the format
    // doesn't add any additional digits when formatting a number.
    // Google says that it also shouldn't add "star" (`*`) characters,
    // like it does in some Israeli formats.
    // Such basic format would only contain "valid punctuation"
    // and "captured group" identifiers ($1, $2, etc).
    //
    // An example of a format that adds additional digits:
    //
    // Country: `AR` (Argentina).
    // Format:
    // {
    //    "pattern": "(\\d)(\\d{2})(\\d{4})(\\d{4})",
    //    "leading_digits_patterns": ["91"],
    //    "national_prefix_formatting_rule": "0$1",
    //    "format": "$2 15-$3-$4",
    //    "international_format": "$1 $2 $3-$4"
    // }
    //
    // In the format above, the `format` adds `15` to the digits when formatting a number.
    // A sidenote: this format actually is suitable because `national_prefix_for_parsing`
    // has previously removed `15` from a national number, so re-adding `15` in `format`
    // doesn't actually result in any extra digits added to user's input.
    // But verifying that would be a complex procedure, so the code chooses a simpler path:
    // it simply filters out all `format`s that contain anything but "captured group" ids.
    //
    // This regular expression is called `ELIGIBLE_FORMAT_PATTERN` in Google's
    // `libphonenumber` code.
    //


    var NON_ALTERING_FORMAT_REG_EXP = new RegExp('[' + VALID_PUNCTUATION + ']*' + // Google developers say:
    // "We require that the first matching group is present in the
    //  output pattern to ensure no data is lost while formatting."
    '\\$1' + '[' + VALID_PUNCTUATION + ']*' + '(\\$\\d[' + VALID_PUNCTUATION + ']*)*' + '$'); // This is the minimum length of the leading digits of a phone number
    // to guarantee the first "leading digits pattern" for a phone number format
    // to be preemptive.

    var MIN_LEADING_DIGITS_LENGTH = 3;

    var AsYouTypeFormatter = /*#__PURE__*/function () {
      function AsYouTypeFormatter(_ref) {
        _ref.state;
            var metadata = _ref.metadata;

        _classCallCheck$2(this, AsYouTypeFormatter);

        this.metadata = metadata;
        this.resetFormat();
      }

      _createClass$2(AsYouTypeFormatter, [{
        key: "resetFormat",
        value: function resetFormat() {
          this.chosenFormat = undefined;
          this.template = undefined;
          this.nationalNumberTemplate = undefined;
          this.populatedNationalNumberTemplate = undefined;
          this.populatedNationalNumberTemplatePosition = -1;
        }
      }, {
        key: "reset",
        value: function reset(numberingPlan, state) {
          this.resetFormat();

          if (numberingPlan) {
            this.isNANP = numberingPlan.callingCode() === '1';
            this.matchingFormats = numberingPlan.formats();

            if (state.nationalSignificantNumber) {
              this.narrowDownMatchingFormats(state);
            }
          } else {
            this.isNANP = undefined;
            this.matchingFormats = [];
          }
        }
        /**
         * Formats an updated phone number.
         * @param  {string} nextDigits — Additional phone number digits.
         * @param  {object} state — `AsYouType` state.
         * @return {[string]} Returns undefined if the updated phone number can't be formatted using any of the available formats.
         */

      }, {
        key: "format",
        value: function format(nextDigits, state) {
          var _this = this;

          // See if the phone number digits can be formatted as a complete phone number.
          // If not, use the results from `formatNationalNumberWithNextDigits()`,
          // which formats based on the chosen formatting pattern.
          //
          // Attempting to format complete phone number first is how it's done
          // in Google's `libphonenumber`, so this library just follows it.
          // Google's `libphonenumber` code doesn't explain in detail why does it
          // attempt to format digits as a complete phone number
          // instead of just going with a previoulsy (or newly) chosen `format`:
          //
          // "Checks to see if there is an exact pattern match for these digits.
          //  If so, we should use this instead of any other formatting template
          //  whose leadingDigitsPattern also matches the input."
          //
          if (canFormatCompleteNumber(state.nationalSignificantNumber, this.metadata)) {
            for (var _iterator = _createForOfIteratorHelperLoose(this.matchingFormats), _step; !(_step = _iterator()).done;) {
              var format = _step.value;
              var formattedCompleteNumber = formatCompleteNumber(state, format, {
                metadata: this.metadata,
                shouldTryNationalPrefixFormattingRule: function shouldTryNationalPrefixFormattingRule(format) {
                  return _this.shouldTryNationalPrefixFormattingRule(format, {
                    international: state.international,
                    nationalPrefix: state.nationalPrefix
                  });
                },
                getSeparatorAfterNationalPrefix: function getSeparatorAfterNationalPrefix(format) {
                  return _this.getSeparatorAfterNationalPrefix(format);
                }
              });

              if (formattedCompleteNumber) {
                this.resetFormat();
                this.chosenFormat = format;
                this.setNationalNumberTemplate(formattedCompleteNumber.replace(/\d/g, DIGIT_PLACEHOLDER), state);
                this.populatedNationalNumberTemplate = formattedCompleteNumber; // With a new formatting template, the matched position
                // using the old template needs to be reset.

                this.populatedNationalNumberTemplatePosition = this.template.lastIndexOf(DIGIT_PLACEHOLDER);
                return formattedCompleteNumber;
              }
            }
          } // Format the digits as a partial (incomplete) phone number
          // using the previously chosen formatting pattern (or a newly chosen one).


          return this.formatNationalNumberWithNextDigits(nextDigits, state);
        } // Formats the next phone number digits.

      }, {
        key: "formatNationalNumberWithNextDigits",
        value: function formatNationalNumberWithNextDigits(nextDigits, state) {
          var previouslyChosenFormat = this.chosenFormat; // Choose a format from the list of matching ones.

          var newlyChosenFormat = this.chooseFormat(state);

          if (newlyChosenFormat) {
            if (newlyChosenFormat === previouslyChosenFormat) {
              // If it can format the next (current) digits
              // using the previously chosen phone number format
              // then return the updated formatted number.
              return this.formatNextNationalNumberDigits(nextDigits);
            } else {
              // If a more appropriate phone number format
              // has been chosen for these "leading digits",
              // then re-format the national phone number part
              // using the newly selected format.
              return this.formatNextNationalNumberDigits(state.getNationalDigits());
            }
          }
        }
      }, {
        key: "narrowDownMatchingFormats",
        value: function narrowDownMatchingFormats(_ref2) {
          var _this2 = this;

          var nationalSignificantNumber = _ref2.nationalSignificantNumber,
              nationalPrefix = _ref2.nationalPrefix,
              international = _ref2.international;
          var leadingDigits = nationalSignificantNumber; // "leading digits" pattern list starts with a
          // "leading digits" pattern fitting a maximum of 3 leading digits.
          // So, after a user inputs 3 digits of a national (significant) phone number
          // this national (significant) number can already be formatted.
          // The next "leading digits" pattern is for 4 leading digits max,
          // and the "leading digits" pattern after it is for 5 leading digits max, etc.
          // This implementation is different from Google's
          // in that it searches for a fitting format
          // even if the user has entered less than
          // `MIN_LEADING_DIGITS_LENGTH` digits of a national number.
          // Because some leading digit patterns already match for a single first digit.

          var leadingDigitsPatternIndex = leadingDigits.length - MIN_LEADING_DIGITS_LENGTH;

          if (leadingDigitsPatternIndex < 0) {
            leadingDigitsPatternIndex = 0;
          }

          this.matchingFormats = this.matchingFormats.filter(function (format) {
            return _this2.formatSuits(format, international, nationalPrefix) && _this2.formatMatches(format, leadingDigits, leadingDigitsPatternIndex);
          }); // If there was a phone number format chosen
          // and it no longer holds given the new leading digits then reset it.
          // The test for this `if` condition is marked as:
          // "Reset a chosen format when it no longer holds given the new leading digits".
          // To construct a valid test case for this one can find a country
          // in `PhoneNumberMetadata.xml` yielding one format for 3 `<leadingDigits>`
          // and yielding another format for 4 `<leadingDigits>` (Australia in this case).

          if (this.chosenFormat && this.matchingFormats.indexOf(this.chosenFormat) === -1) {
            this.resetFormat();
          }
        }
      }, {
        key: "formatSuits",
        value: function formatSuits(format, international, nationalPrefix) {
          // When a prefix before a national (significant) number is
          // simply a national prefix, then it's parsed as `this.nationalPrefix`.
          // In more complex cases, a prefix before national (significant) number
          // could include a national prefix as well as some "capturing groups",
          // and in that case there's no info whether a national prefix has been parsed.
          // If national prefix is not used when formatting a phone number
          // using this format, but a national prefix has been entered by the user,
          // and was extracted, then discard such phone number format.
          // In Google's "AsYouType" formatter code, the equivalent would be this part:
          // https://github.com/google/libphonenumber/blob/0a45cfd96e71cad8edb0e162a70fcc8bd9728933/java/libphonenumber/src/com/google/i18n/phonenumbers/AsYouTypeFormatter.java#L175-L184
          if (nationalPrefix && !format.usesNationalPrefix() && // !format.domesticCarrierCodeFormattingRule() &&
          !format.nationalPrefixIsOptionalWhenFormattingInNationalFormat()) {
            return false;
          } // If national prefix is mandatory for this phone number format
          // and there're no guarantees that a national prefix is present in user input
          // then discard this phone number format as not suitable.
          // In Google's "AsYouType" formatter code, the equivalent would be this part:
          // https://github.com/google/libphonenumber/blob/0a45cfd96e71cad8edb0e162a70fcc8bd9728933/java/libphonenumber/src/com/google/i18n/phonenumbers/AsYouTypeFormatter.java#L185-L193


          if (!international && !nationalPrefix && format.nationalPrefixIsMandatoryWhenFormattingInNationalFormat()) {
            return false;
          }

          return true;
        }
      }, {
        key: "formatMatches",
        value: function formatMatches(format, leadingDigits, leadingDigitsPatternIndex) {
          var leadingDigitsPatternsCount = format.leadingDigitsPatterns().length; // If this format is not restricted to a certain
          // leading digits pattern then it fits.
          // The test case could be found by searching for "leadingDigitsPatternsCount === 0".

          if (leadingDigitsPatternsCount === 0) {
            return true;
          } // Start narrowing down the list of possible formats based on the leading digits.
          // (only previously matched formats take part in the narrowing down process)
          // `leading_digits_patterns` start with 3 digits min
          // and then go up from there one digit at a time.


          leadingDigitsPatternIndex = Math.min(leadingDigitsPatternIndex, leadingDigitsPatternsCount - 1);
          var leadingDigitsPattern = format.leadingDigitsPatterns()[leadingDigitsPatternIndex]; // Google imposes a requirement on the leading digits
          // to be minimum 3 digits long in order to be eligible
          // for checking those with a leading digits pattern.
          //
          // Since `leading_digits_patterns` start with 3 digits min,
          // Google's original `libphonenumber` library only starts
          // excluding any non-matching formats only when the
          // national number entered so far is at least 3 digits long,
          // otherwise format matching would give false negatives.
          //
          // For example, when the digits entered so far are `2`
          // and the leading digits pattern is `21` –
          // it's quite obvious in this case that the format could be the one
          // but due to the absence of further digits it would give false negative.
          //
          // Also, `leading_digits_patterns` doesn't always correspond to a single
          // digits count. For example, `60|8` pattern would already match `8`
          // but the `60` part would require having at least two leading digits,
          // so the whole pattern would require inputting two digits first in order to
          // decide on whether it matches the input, even when the input is "80".
          //
          // This library — `libphonenumber-js` — allows filtering by `leading_digits_patterns`
          // even when there's only 1 or 2 digits of the national (significant) number.
          // To do that, it uses a non-strict pattern matcher written specifically for that.
          //

          if (leadingDigits.length < MIN_LEADING_DIGITS_LENGTH) {
            // Before leading digits < 3 matching was implemented:
            // return true
            //
            // After leading digits < 3 matching was implemented:
            try {
              return new PatternMatcher(leadingDigitsPattern).match(leadingDigits, {
                allowOverflow: true
              }) !== undefined;
            } catch (error)
            /* istanbul ignore next */
            {
              // There's a slight possibility that there could be some undiscovered bug
              // in the pattern matcher code. Since the "leading digits < 3 matching"
              // feature is not "essential" for operation, it can fall back to the old way
              // in case of any issues rather than halting the application's execution.
              console.error(error);
              return true;
            }
          } // If at least `MIN_LEADING_DIGITS_LENGTH` digits of a national number are
          // available then use the usual regular expression matching.
          //
          // The whole pattern is wrapped in round brackets (`()`) because
          // the pattern can use "or" operator (`|`) at the top level of the pattern.
          //


          return new RegExp("^(".concat(leadingDigitsPattern, ")")).test(leadingDigits);
        }
      }, {
        key: "getFormatFormat",
        value: function getFormatFormat(format, international) {
          return international ? format.internationalFormat() : format.format();
        }
      }, {
        key: "chooseFormat",
        value: function chooseFormat(state) {
          var _this3 = this;

          var _loop = function _loop() {
            var format = _step2.value;

            // If this format is currently being used
            // and is still suitable, then stick to it.
            if (_this3.chosenFormat === format) {
              return "break";
            } // Sometimes, a formatting rule inserts additional digits in a phone number,
            // and "as you type" formatter can't do that: it should only use the digits
            // that the user has input.
            //
            // For example, in Argentina, there's a format for mobile phone numbers:
            //
            // {
            //    "pattern": "(\\d)(\\d{2})(\\d{4})(\\d{4})",
            //    "leading_digits_patterns": ["91"],
            //    "national_prefix_formatting_rule": "0$1",
            //    "format": "$2 15-$3-$4",
            //    "international_format": "$1 $2 $3-$4"
            // }
            //
            // In that format, `international_format` is used instead of `format`
            // because `format` inserts `15` in the formatted number,
            // and `AsYouType` formatter should only use the digits
            // the user has actually input, without adding any extra digits.
            // In this case, it wouldn't make a difference, because the `15`
            // is first stripped when applying `national_prefix_for_parsing`
            // and then re-added when using `format`, so in reality it doesn't
            // add any new digits to the number, but to detect that, the code
            // would have to be more complex: it would have to try formatting
            // the digits using the format and then see if any digits have
            // actually been added or removed, and then, every time a new digit
            // is input, it should re-check whether the chosen format doesn't
            // alter the digits.
            //
            // Google's code doesn't go that far, and so does this library:
            // it simply requires that a `format` doesn't add any additonal
            // digits to user's input.
            //
            // Also, people in general should move from inputting phone numbers
            // in national format (possibly with national prefixes)
            // and use international phone number format instead:
            // it's a logical thing in the modern age of mobile phones,
            // globalization and the internet.
            //

            /* istanbul ignore if */


            if (!NON_ALTERING_FORMAT_REG_EXP.test(_this3.getFormatFormat(format, state.international))) {
              return "continue";
            }

            if (!_this3.createTemplateForFormat(format, state)) {
              // Remove the format if it can't generate a template.
              _this3.matchingFormats = _this3.matchingFormats.filter(function (_) {
                return _ !== format;
              });
              return "continue";
            }

            _this3.chosenFormat = format;
            return "break";
          };

          // When there are multiple available formats, the formatter uses the first
          // format where a formatting template could be created.
          //
          // For some weird reason, `istanbul` says "else path not taken"
          // for the `for of` line below. Supposedly that means that
          // the loop doesn't ever go over the last element in the list.
          // That's true because there always is `this.chosenFormat`
          // when `this.matchingFormats` is non-empty.
          // And, for some weird reason, it doesn't think that the case
          // with empty `this.matchingFormats` qualifies for a valid "else" path.
          // So simply muting this `istanbul` warning.
          // It doesn't skip the contents of the `for of` loop,
          // it just skips the `for of` line.
          //

          /* istanbul ignore next */
          for (var _iterator2 = _createForOfIteratorHelperLoose(this.matchingFormats.slice()), _step2; !(_step2 = _iterator2()).done;) {
            var _ret = _loop();

            if (_ret === "break") break;
            if (_ret === "continue") continue;
          }

          if (!this.chosenFormat) {
            // No format matches the national (significant) phone number.
            this.resetFormat();
          }

          return this.chosenFormat;
        }
      }, {
        key: "createTemplateForFormat",
        value: function createTemplateForFormat(format, state) {
          // The formatter doesn't format numbers when numberPattern contains '|', e.g.
          // (20|3)\d{4}. In those cases we quickly return.
          // (Though there's no such format in current metadata)

          /* istanbul ignore if */
          if (format.pattern().indexOf('|') >= 0) {
            return;
          } // Get formatting template for this phone number format


          var template = this.getTemplateForFormat(format, state); // If the national number entered is too long
          // for any phone number format, then abort.

          if (template) {
            this.setNationalNumberTemplate(template, state);
            return true;
          }
        }
      }, {
        key: "getSeparatorAfterNationalPrefix",
        value: function getSeparatorAfterNationalPrefix(format) {
          // `US` metadata doesn't have a `national_prefix_formatting_rule`,
          // so the `if` condition below doesn't apply to `US`,
          // but in reality there shoudl be a separator
          // between a national prefix and a national (significant) number.
          // So `US` national prefix separator is a "special" "hardcoded" case.
          if (this.isNANP) {
            return ' ';
          } // If a `format` has a `national_prefix_formatting_rule`
          // and that rule has a separator after a national prefix,
          // then it means that there should be a separator
          // between a national prefix and a national (significant) number.


          if (format && format.nationalPrefixFormattingRule() && NATIONAL_PREFIX_SEPARATORS_PATTERN.test(format.nationalPrefixFormattingRule())) {
            return ' ';
          } // At this point, there seems to be no clear evidence that
          // there should be a separator between a national prefix
          // and a national (significant) number. So don't insert one.


          return '';
        }
      }, {
        key: "getInternationalPrefixBeforeCountryCallingCode",
        value: function getInternationalPrefixBeforeCountryCallingCode(_ref3, options) {
          var IDDPrefix = _ref3.IDDPrefix,
              missingPlus = _ref3.missingPlus;

          if (IDDPrefix) {
            return options && options.spacing === false ? IDDPrefix : IDDPrefix + ' ';
          }

          if (missingPlus) {
            return '';
          }

          return '+';
        }
      }, {
        key: "getTemplate",
        value: function getTemplate(state) {
          if (!this.template) {
            return;
          } // `this.template` holds the template for a "complete" phone number.
          // The currently entered phone number is most likely not "complete",
          // so trim all non-populated digits.


          var index = -1;
          var i = 0;
          var internationalPrefix = state.international ? this.getInternationalPrefixBeforeCountryCallingCode(state, {
            spacing: false
          }) : '';

          while (i < internationalPrefix.length + state.getDigitsWithoutInternationalPrefix().length) {
            index = this.template.indexOf(DIGIT_PLACEHOLDER, index + 1);
            i++;
          }

          return cutAndStripNonPairedParens(this.template, index + 1);
        }
      }, {
        key: "setNationalNumberTemplate",
        value: function setNationalNumberTemplate(template, state) {
          this.nationalNumberTemplate = template;
          this.populatedNationalNumberTemplate = template; // With a new formatting template, the matched position
          // using the old template needs to be reset.

          this.populatedNationalNumberTemplatePosition = -1; // For convenience, the public `.template` property
          // contains the whole international number
          // if the phone number being input is international:
          // 'x' for the '+' sign, 'x'es for the country phone code,
          // a spacebar and then the template for the formatted national number.

          if (state.international) {
            this.template = this.getInternationalPrefixBeforeCountryCallingCode(state).replace(/[\d\+]/g, DIGIT_PLACEHOLDER) + repeat$1(DIGIT_PLACEHOLDER, state.callingCode.length) + ' ' + template;
          } else {
            this.template = template;
          }
        }
        /**
         * Generates formatting template for a national phone number,
         * optionally containing a national prefix, for a format.
         * @param  {Format} format
         * @param  {string} nationalPrefix
         * @return {string}
         */

      }, {
        key: "getTemplateForFormat",
        value: function getTemplateForFormat(format, _ref4) {
          var nationalSignificantNumber = _ref4.nationalSignificantNumber,
              international = _ref4.international,
              nationalPrefix = _ref4.nationalPrefix,
              complexPrefixBeforeNationalSignificantNumber = _ref4.complexPrefixBeforeNationalSignificantNumber;
          var pattern = format.pattern();
          /* istanbul ignore else */

          {
            pattern = pattern // Replace anything in the form of [..] with \d
            .replace(CREATE_CHARACTER_CLASS_PATTERN(), '\\d') // Replace any standalone digit (not the one in `{}`) with \d
            .replace(CREATE_STANDALONE_DIGIT_PATTERN(), '\\d');
          } // Generate a dummy national number (consisting of `9`s)
          // that fits this format's `pattern`.
          //
          // This match will always succeed,
          // because the "longest dummy phone number"
          // has enough length to accomodate any possible
          // national phone number format pattern.
          //


          var digits = LONGEST_DUMMY_PHONE_NUMBER.match(pattern)[0]; // If the national number entered is too long
          // for any phone number format, then abort.

          if (nationalSignificantNumber.length > digits.length) {
            return;
          } // Get a formatting template which can be used to efficiently format
          // a partial number where digits are added one by one.
          // Below `strictPattern` is used for the
          // regular expression (with `^` and `$`).
          // This wasn't originally in Google's `libphonenumber`
          // and I guess they don't really need it
          // because they're not using "templates" to format phone numbers
          // but I added `strictPattern` after encountering
          // South Korean phone number formatting bug.
          //
          // Non-strict regular expression bug demonstration:
          //
          // this.nationalSignificantNumber : `111111111` (9 digits)
          //
          // pattern : (\d{2})(\d{3,4})(\d{4})
          // format : `$1 $2 $3`
          // digits : `9999999999` (10 digits)
          //
          // '9999999999'.replace(new RegExp(/(\d{2})(\d{3,4})(\d{4})/g), '$1 $2 $3') = "99 9999 9999"
          //
          // template : xx xxxx xxxx
          //
          // But the correct template in this case is `xx xxx xxxx`.
          // The template was generated incorrectly because of the
          // `{3,4}` variability in the `pattern`.
          //
          // The fix is, if `this.nationalSignificantNumber` has already sufficient length
          // to satisfy the `pattern` completely then `this.nationalSignificantNumber`
          // is used instead of `digits`.


          var strictPattern = new RegExp('^' + pattern + '$');
          var nationalNumberDummyDigits = nationalSignificantNumber.replace(/\d/g, DUMMY_DIGIT); // If `this.nationalSignificantNumber` has already sufficient length
          // to satisfy the `pattern` completely then use it
          // instead of `digits`.

          if (strictPattern.test(nationalNumberDummyDigits)) {
            digits = nationalNumberDummyDigits;
          }

          var numberFormat = this.getFormatFormat(format, international);
          var nationalPrefixIncludedInTemplate; // If a user did input a national prefix (and that's guaranteed),
          // and if a `format` does have a national prefix formatting rule,
          // then see if that national prefix formatting rule
          // prepends exactly the same national prefix the user has input.
          // If that's the case, then use the `format` with the national prefix formatting rule.
          // Otherwise, use  the `format` without the national prefix formatting rule,
          // and prepend a national prefix manually to it.

          if (this.shouldTryNationalPrefixFormattingRule(format, {
            international: international,
            nationalPrefix: nationalPrefix
          })) {
            var numberFormatWithNationalPrefix = numberFormat.replace(FIRST_GROUP_PATTERN, format.nationalPrefixFormattingRule()); // If `national_prefix_formatting_rule` of a `format` simply prepends
            // national prefix at the start of a national (significant) number,
            // then such formatting can be used with `AsYouType` formatter.
            // There seems to be no `else` case: everywhere in metadata,
            // national prefix formatting rule is national prefix + $1,
            // or `($1)`, in which case such format isn't even considered
            // when the user has input a national prefix.

            /* istanbul ignore else */

            if (parseDigits(format.nationalPrefixFormattingRule()) === (nationalPrefix || '') + parseDigits('$1')) {
              numberFormat = numberFormatWithNationalPrefix;
              nationalPrefixIncludedInTemplate = true; // Replace all digits of the national prefix in the formatting template
              // with `DIGIT_PLACEHOLDER`s.

              if (nationalPrefix) {
                var i = nationalPrefix.length;

                while (i > 0) {
                  numberFormat = numberFormat.replace(/\d/, DIGIT_PLACEHOLDER);
                  i--;
                }
              }
            }
          } // Generate formatting template for this phone number format.


          var template = digits // Format the dummy phone number according to the format.
          .replace(new RegExp(pattern), numberFormat) // Replace each dummy digit with a DIGIT_PLACEHOLDER.
          .replace(new RegExp(DUMMY_DIGIT, 'g'), DIGIT_PLACEHOLDER); // If a prefix of a national (significant) number is not as simple
          // as just a basic national prefix, then just prepend such prefix
          // before the national (significant) number, optionally spacing
          // the two with a whitespace.

          if (!nationalPrefixIncludedInTemplate) {
            if (complexPrefixBeforeNationalSignificantNumber) {
              // Prepend the prefix to the template manually.
              template = repeat$1(DIGIT_PLACEHOLDER, complexPrefixBeforeNationalSignificantNumber.length) + ' ' + template;
            } else if (nationalPrefix) {
              // Prepend national prefix to the template manually.
              template = repeat$1(DIGIT_PLACEHOLDER, nationalPrefix.length) + this.getSeparatorAfterNationalPrefix(format) + template;
            }
          }

          if (international) {
            template = applyInternationalSeparatorStyle(template);
          }

          return template;
        }
      }, {
        key: "formatNextNationalNumberDigits",
        value: function formatNextNationalNumberDigits(digits) {
          var result = populateTemplateWithDigits(this.populatedNationalNumberTemplate, this.populatedNationalNumberTemplatePosition, digits);

          if (!result) {
            // Reset the format.
            this.resetFormat();
            return;
          }

          this.populatedNationalNumberTemplate = result[0];
          this.populatedNationalNumberTemplatePosition = result[1]; // Return the formatted phone number so far.

          return cutAndStripNonPairedParens(this.populatedNationalNumberTemplate, this.populatedNationalNumberTemplatePosition + 1); // The old way which was good for `input-format` but is not so good
          // for `react-phone-number-input`'s default input (`InputBasic`).
          // return closeNonPairedParens(this.populatedNationalNumberTemplate, this.populatedNationalNumberTemplatePosition + 1)
          // 	.replace(new RegExp(DIGIT_PLACEHOLDER, 'g'), ' ')
        }
      }, {
        key: "shouldTryNationalPrefixFormattingRule",
        value: function shouldTryNationalPrefixFormattingRule(format, _ref5) {
          var international = _ref5.international,
              nationalPrefix = _ref5.nationalPrefix;

          if (format.nationalPrefixFormattingRule()) {
            // In some countries, `national_prefix_formatting_rule` is `($1)`,
            // so it applies even if the user hasn't input a national prefix.
            // `format.usesNationalPrefix()` detects such cases.
            var usesNationalPrefix = format.usesNationalPrefix();

            if (usesNationalPrefix && nationalPrefix || !usesNationalPrefix && !international) {
              return true;
            }
          }
        }
      }]);

      return AsYouTypeFormatter;
    }();

    function _slicedToArray$1(arr, i) { return _arrayWithHoles$1(arr) || _iterableToArrayLimit$1(arr, i) || _unsupportedIterableToArray$1(arr, i) || _nonIterableRest$1(); }

    function _nonIterableRest$1() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

    function _unsupportedIterableToArray$1(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray$1(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray$1(o, minLen); }

    function _arrayLikeToArray$1(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

    function _iterableToArrayLimit$1(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

    function _arrayWithHoles$1(arr) { if (Array.isArray(arr)) return arr; }

    function _classCallCheck$1(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _defineProperties$1(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

    function _createClass$1(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties$1(Constructor.prototype, protoProps); if (staticProps) _defineProperties$1(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }
    var VALID_FORMATTED_PHONE_NUMBER_DIGITS_PART = '[' + VALID_PUNCTUATION + VALID_DIGITS + ']+';
    var VALID_FORMATTED_PHONE_NUMBER_DIGITS_PART_PATTERN = new RegExp('^' + VALID_FORMATTED_PHONE_NUMBER_DIGITS_PART + '$', 'i');
    var VALID_FORMATTED_PHONE_NUMBER_PART = '(?:' + '[' + PLUS_CHARS + ']' + '[' + VALID_PUNCTUATION + VALID_DIGITS + ']*' + '|' + '[' + VALID_PUNCTUATION + VALID_DIGITS + ']+' + ')';
    var AFTER_PHONE_NUMBER_DIGITS_END_PATTERN = new RegExp('[^' + VALID_PUNCTUATION + VALID_DIGITS + ']+' + '.*' + '$'); // Tests whether `national_prefix_for_parsing` could match
    // different national prefixes.
    // Matches anything that's not a digit or a square bracket.

    var COMPLEX_NATIONAL_PREFIX = /[^\d\[\]]/;

    var AsYouTypeParser = /*#__PURE__*/function () {
      function AsYouTypeParser(_ref) {
        var defaultCountry = _ref.defaultCountry,
            defaultCallingCode = _ref.defaultCallingCode,
            metadata = _ref.metadata,
            onNationalSignificantNumberChange = _ref.onNationalSignificantNumberChange;

        _classCallCheck$1(this, AsYouTypeParser);

        this.defaultCountry = defaultCountry;
        this.defaultCallingCode = defaultCallingCode;
        this.metadata = metadata;
        this.onNationalSignificantNumberChange = onNationalSignificantNumberChange;
      }

      _createClass$1(AsYouTypeParser, [{
        key: "input",
        value: function input(text, state) {
          var _extractFormattedDigi = extractFormattedDigitsAndPlus(text),
              _extractFormattedDigi2 = _slicedToArray$1(_extractFormattedDigi, 2),
              formattedDigits = _extractFormattedDigi2[0],
              hasPlus = _extractFormattedDigi2[1];

          var digits = parseDigits(formattedDigits); // Checks for a special case: just a leading `+` has been entered.

          var justLeadingPlus;

          if (hasPlus) {
            if (!state.digits) {
              state.startInternationalNumber();

              if (!digits) {
                justLeadingPlus = true;
              }
            }
          }

          if (digits) {
            this.inputDigits(digits, state);
          }

          return {
            digits: digits,
            justLeadingPlus: justLeadingPlus
          };
        }
        /**
         * Inputs "next" phone number digits.
         * @param  {string} digits
         * @return {string} [formattedNumber] Formatted national phone number (if it can be formatted at this stage). Returning `undefined` means "don't format the national phone number at this stage".
         */

      }, {
        key: "inputDigits",
        value: function inputDigits(nextDigits, state) {
          var digits = state.digits;
          var hasReceivedThreeLeadingDigits = digits.length < 3 && digits.length + nextDigits.length >= 3; // Append phone number digits.

          state.appendDigits(nextDigits); // Attempt to extract IDD prefix:
          // Some users input their phone number in international format,
          // but in an "out-of-country" dialing format instead of using the leading `+`.
          // https://github.com/catamphetamine/libphonenumber-js/issues/185
          // Detect such numbers as soon as there're at least 3 digits.
          // Google's library attempts to extract IDD prefix at 3 digits,
          // so this library just copies that behavior.
          // I guess that's because the most commot IDD prefixes are
          // `00` (Europe) and `011` (US).
          // There exist really long IDD prefixes too:
          // for example, in Australia the default IDD prefix is `0011`,
          // and it could even be as long as `14880011`.
          // An IDD prefix is extracted here, and then every time when
          // there's a new digit and the number couldn't be formatted.

          if (hasReceivedThreeLeadingDigits) {
            this.extractIddPrefix(state);
          }

          if (this.isWaitingForCountryCallingCode(state)) {
            if (!this.extractCountryCallingCode(state)) {
              return;
            }
          } else {
            state.appendNationalSignificantNumberDigits(nextDigits);
          } // If a phone number is being input in international format,
          // then it's not valid for it to have a national prefix.
          // Still, some people incorrectly input such numbers with a national prefix.
          // In such cases, only attempt to strip a national prefix if the number becomes too long.
          // (but that is done later, not here)


          if (!state.international) {
            if (!this.hasExtractedNationalSignificantNumber) {
              this.extractNationalSignificantNumber(state.getNationalDigits(), function (stateUpdate) {
                return state.update(stateUpdate);
              });
            }
          }
        }
      }, {
        key: "isWaitingForCountryCallingCode",
        value: function isWaitingForCountryCallingCode(_ref2) {
          var international = _ref2.international,
              callingCode = _ref2.callingCode;
          return international && !callingCode;
        } // Extracts a country calling code from a number
        // being entered in internatonal format.

      }, {
        key: "extractCountryCallingCode",
        value: function extractCountryCallingCode$1(state) {
          var _extractCountryCallin = extractCountryCallingCode('+' + state.getDigitsWithoutInternationalPrefix(), this.defaultCountry, this.defaultCallingCode, this.metadata.metadata),
              countryCallingCode = _extractCountryCallin.countryCallingCode,
              number = _extractCountryCallin.number;

          if (countryCallingCode) {
            state.setCallingCode(countryCallingCode);
            state.update({
              nationalSignificantNumber: number
            });
            return true;
          }
        }
      }, {
        key: "reset",
        value: function reset(numberingPlan) {
          if (numberingPlan) {
            this.hasSelectedNumberingPlan = true;

            var nationalPrefixForParsing = numberingPlan._nationalPrefixForParsing();

            this.couldPossiblyExtractAnotherNationalSignificantNumber = nationalPrefixForParsing && COMPLEX_NATIONAL_PREFIX.test(nationalPrefixForParsing);
          } else {
            this.hasSelectedNumberingPlan = undefined;
            this.couldPossiblyExtractAnotherNationalSignificantNumber = undefined;
          }
        }
        /**
         * Extracts a national (significant) number from user input.
         * Google's library is different in that it only applies `national_prefix_for_parsing`
         * and doesn't apply `national_prefix_transform_rule` after that.
         * https://github.com/google/libphonenumber/blob/a3d70b0487875475e6ad659af404943211d26456/java/libphonenumber/src/com/google/i18n/phonenumbers/AsYouTypeFormatter.java#L539
         * @return {boolean} [extracted]
         */

      }, {
        key: "extractNationalSignificantNumber",
        value: function extractNationalSignificantNumber(nationalDigits, setState) {
          if (!this.hasSelectedNumberingPlan) {
            return;
          }

          var _extractNationalNumbe = extractNationalNumberFromPossiblyIncompleteNumber(nationalDigits, this.metadata),
              nationalPrefix = _extractNationalNumbe.nationalPrefix,
              nationalNumber = _extractNationalNumbe.nationalNumber,
              carrierCode = _extractNationalNumbe.carrierCode;

          if (nationalNumber === nationalDigits) {
            return;
          }

          this.onExtractedNationalNumber(nationalPrefix, carrierCode, nationalNumber, nationalDigits, setState);
          return true;
        }
        /**
         * In Google's code this function is called "attempt to extract longer NDD".
         * "Some national prefixes are a substring of others", they say.
         * @return {boolean} [result] — Returns `true` if extracting a national prefix produced different results from what they were.
         */

      }, {
        key: "extractAnotherNationalSignificantNumber",
        value: function extractAnotherNationalSignificantNumber(nationalDigits, prevNationalSignificantNumber, setState) {
          if (!this.hasExtractedNationalSignificantNumber) {
            return this.extractNationalSignificantNumber(nationalDigits, setState);
          }

          if (!this.couldPossiblyExtractAnotherNationalSignificantNumber) {
            return;
          }

          var _extractNationalNumbe2 = extractNationalNumberFromPossiblyIncompleteNumber(nationalDigits, this.metadata),
              nationalPrefix = _extractNationalNumbe2.nationalPrefix,
              nationalNumber = _extractNationalNumbe2.nationalNumber,
              carrierCode = _extractNationalNumbe2.carrierCode; // If a national prefix has been extracted previously,
          // then it's always extracted as additional digits are added.
          // That's assuming `extractNationalNumberFromPossiblyIncompleteNumber()`
          // doesn't do anything different from what it currently does.
          // So, just in case, here's this check, though it doesn't occur.

          /* istanbul ignore if */


          if (nationalNumber === prevNationalSignificantNumber) {
            return;
          }

          this.onExtractedNationalNumber(nationalPrefix, carrierCode, nationalNumber, nationalDigits, setState);
          return true;
        }
      }, {
        key: "onExtractedNationalNumber",
        value: function onExtractedNationalNumber(nationalPrefix, carrierCode, nationalSignificantNumber, nationalDigits, setState) {
          var complexPrefixBeforeNationalSignificantNumber;
          var nationalSignificantNumberMatchesInput; // This check also works with empty `this.nationalSignificantNumber`.

          var nationalSignificantNumberIndex = nationalDigits.lastIndexOf(nationalSignificantNumber); // If the extracted national (significant) number is the
          // last substring of the `digits`, then it means that it hasn't been altered:
          // no digits have been removed from the national (significant) number
          // while applying `national_prefix_transform_rule`.
          // https://gitlab.com/catamphetamine/libphonenumber-js/-/blob/master/METADATA.md#national_prefix_for_parsing--national_prefix_transform_rule

          if (nationalSignificantNumberIndex >= 0 && nationalSignificantNumberIndex === nationalDigits.length - nationalSignificantNumber.length) {
            nationalSignificantNumberMatchesInput = true; // If a prefix of a national (significant) number is not as simple
            // as just a basic national prefix, then such prefix is stored in
            // `this.complexPrefixBeforeNationalSignificantNumber` property and will be
            // prepended "as is" to the national (significant) number to produce
            // a formatted result.

            var prefixBeforeNationalNumber = nationalDigits.slice(0, nationalSignificantNumberIndex); // `prefixBeforeNationalNumber` is always non-empty,
            // because `onExtractedNationalNumber()` isn't called
            // when a national (significant) number hasn't been actually "extracted":
            // when a national (significant) number is equal to the national part of `digits`,
            // then `onExtractedNationalNumber()` doesn't get called.

            if (prefixBeforeNationalNumber !== nationalPrefix) {
              complexPrefixBeforeNationalSignificantNumber = prefixBeforeNationalNumber;
            }
          }

          setState({
            nationalPrefix: nationalPrefix,
            carrierCode: carrierCode,
            nationalSignificantNumber: nationalSignificantNumber,
            nationalSignificantNumberMatchesInput: nationalSignificantNumberMatchesInput,
            complexPrefixBeforeNationalSignificantNumber: complexPrefixBeforeNationalSignificantNumber
          }); // `onExtractedNationalNumber()` is only called when
          // the national (significant) number actually did change.

          this.hasExtractedNationalSignificantNumber = true;
          this.onNationalSignificantNumberChange();
        }
      }, {
        key: "reExtractNationalSignificantNumber",
        value: function reExtractNationalSignificantNumber(state) {
          // Attempt to extract a national prefix.
          //
          // Some people incorrectly input national prefix
          // in an international phone number.
          // For example, some people write British phone numbers as `+44(0)...`.
          //
          // Also, in some rare cases, it is valid for a national prefix
          // to be a part of an international phone number.
          // For example, mobile phone numbers in Mexico are supposed to be
          // dialled internationally using a `1` national prefix,
          // so the national prefix will be part of an international number.
          //
          // Quote from:
          // https://www.mexperience.com/dialing-cell-phones-in-mexico/
          //
          // "Dialing a Mexican cell phone from abroad
          // When you are calling a cell phone number in Mexico from outside Mexico,
          // it’s necessary to dial an additional “1” after Mexico’s country code
          // (which is “52”) and before the area code.
          // You also ignore the 045, and simply dial the area code and the
          // cell phone’s number.
          //
          // If you don’t add the “1”, you’ll receive a recorded announcement
          // asking you to redial using it.
          //
          // For example, if you are calling from the USA to a cell phone
          // in Mexico City, you would dial +52 – 1 – 55 – 1234 5678.
          // (Note that this is different to calling a land line in Mexico City
          // from abroad, where the number dialed would be +52 – 55 – 1234 5678)".
          //
          // Google's demo output:
          // https://libphonenumber.appspot.com/phonenumberparser?number=%2b5215512345678&country=MX
          //
          if (this.extractAnotherNationalSignificantNumber(state.getNationalDigits(), state.nationalSignificantNumber, function (stateUpdate) {
            return state.update(stateUpdate);
          })) {
            return true;
          } // If no format matches the phone number, then it could be
          // "a really long IDD" (quote from a comment in Google's library).
          // An IDD prefix is first extracted when the user has entered at least 3 digits,
          // and then here — every time when there's a new digit and the number
          // couldn't be formatted.
          // For example, in Australia the default IDD prefix is `0011`,
          // and it could even be as long as `14880011`.
          //
          // Could also check `!hasReceivedThreeLeadingDigits` here
          // to filter out the case when this check duplicates the one
          // already performed when there're 3 leading digits,
          // but it's not a big deal, and in most cases there
          // will be a suitable `format` when there're 3 leading digits.
          //


          if (this.extractIddPrefix(state)) {
            this.extractCallingCodeAndNationalSignificantNumber(state);
            return true;
          } // Google's AsYouType formatter supports sort of an "autocorrection" feature
          // when it "autocorrects" numbers that have been input for a country
          // with that country's calling code.
          // Such "autocorrection" feature looks weird, but different people have been requesting it:
          // https://github.com/catamphetamine/libphonenumber-js/issues/376
          // https://github.com/catamphetamine/libphonenumber-js/issues/375
          // https://github.com/catamphetamine/libphonenumber-js/issues/316


          if (this.fixMissingPlus(state)) {
            this.extractCallingCodeAndNationalSignificantNumber(state);
            return true;
          }
        }
      }, {
        key: "extractIddPrefix",
        value: function extractIddPrefix(state) {
          // An IDD prefix can't be present in a number written with a `+`.
          // Also, don't re-extract an IDD prefix if has already been extracted.
          var international = state.international,
              IDDPrefix = state.IDDPrefix,
              digits = state.digits;
              state.nationalSignificantNumber;

          if (international || IDDPrefix) {
            return;
          } // Some users input their phone number in "out-of-country"
          // dialing format instead of using the leading `+`.
          // https://github.com/catamphetamine/libphonenumber-js/issues/185
          // Detect such numbers.


          var numberWithoutIDD = stripIddPrefix(digits, this.defaultCountry, this.defaultCallingCode, this.metadata.metadata);

          if (numberWithoutIDD !== undefined && numberWithoutIDD !== digits) {
            // If an IDD prefix was stripped then convert the IDD-prefixed number
            // to international number for subsequent parsing.
            state.update({
              IDDPrefix: digits.slice(0, digits.length - numberWithoutIDD.length)
            });
            this.startInternationalNumber(state);
            return true;
          }
        }
      }, {
        key: "fixMissingPlus",
        value: function fixMissingPlus(state) {
          if (!state.international) {
            var _extractCountryCallin2 = extractCountryCallingCodeFromInternationalNumberWithoutPlusSign(state.digits, this.defaultCountry, this.defaultCallingCode, this.metadata.metadata),
                newCallingCode = _extractCountryCallin2.countryCallingCode;
                _extractCountryCallin2.number;

            if (newCallingCode) {
              state.update({
                missingPlus: true
              });
              this.startInternationalNumber(state);
              return true;
            }
          }
        }
      }, {
        key: "startInternationalNumber",
        value: function startInternationalNumber(state) {
          state.startInternationalNumber(); // If a national (significant) number has been extracted before, reset it.

          if (state.nationalSignificantNumber) {
            state.resetNationalSignificantNumber();
            this.onNationalSignificantNumberChange();
            this.hasExtractedNationalSignificantNumber = undefined;
          }
        }
      }, {
        key: "extractCallingCodeAndNationalSignificantNumber",
        value: function extractCallingCodeAndNationalSignificantNumber(state) {
          if (this.extractCountryCallingCode(state)) {
            // `this.extractCallingCode()` is currently called when the number
            // couldn't be formatted during the standard procedure.
            // Normally, the national prefix would be re-extracted
            // for an international number if such number couldn't be formatted,
            // but since it's already not able to be formatted,
            // there won't be yet another retry, so also extract national prefix here.
            this.extractNationalSignificantNumber(state.getNationalDigits(), function (stateUpdate) {
              return state.update(stateUpdate);
            });
          }
        }
      }]);

      return AsYouTypeParser;
    }();

    function extractFormattedPhoneNumber(text) {
      // Attempt to extract a possible number from the string passed in.
      var startsAt = text.search(VALID_FORMATTED_PHONE_NUMBER_PART);

      if (startsAt < 0) {
        return;
      } // Trim everything to the left of the phone number.


      text = text.slice(startsAt); // Trim the `+`.

      var hasPlus;

      if (text[0] === '+') {
        hasPlus = true;
        text = text.slice('+'.length);
      } // Trim everything to the right of the phone number.


      text = text.replace(AFTER_PHONE_NUMBER_DIGITS_END_PATTERN, ''); // Re-add the previously trimmed `+`.

      if (hasPlus) {
        text = '+' + text;
      }

      return text;
    }
    /**
     * Extracts formatted phone number digits (and a `+`) from text (if there're any).
     * @param  {string} text
     * @return {any[]}
     */


    function _extractFormattedDigitsAndPlus(text) {
      // Extract a formatted phone number part from text.
      var extractedNumber = extractFormattedPhoneNumber(text) || ''; // Trim a `+`.

      if (extractedNumber[0] === '+') {
        return [extractedNumber.slice('+'.length), true];
      }

      return [extractedNumber];
    }
    /**
     * Extracts formatted phone number digits (and a `+`) from text (if there're any).
     * @param  {string} text
     * @return {any[]}
     */


    function extractFormattedDigitsAndPlus(text) {
      var _extractFormattedDigi3 = _extractFormattedDigitsAndPlus(text),
          _extractFormattedDigi4 = _slicedToArray$1(_extractFormattedDigi3, 2),
          formattedDigits = _extractFormattedDigi4[0],
          hasPlus = _extractFormattedDigi4[1]; // If the extracted phone number part
      // can possibly be a part of some valid phone number
      // then parse phone number characters from a formatted phone number.


      if (!VALID_FORMATTED_PHONE_NUMBER_DIGITS_PART_PATTERN.test(formattedDigits)) {
        formattedDigits = '';
      }

      return [formattedDigits, hasPlus];
    }

    function _typeof(obj) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (obj) { return typeof obj; } : function (obj) { return obj && "function" == typeof Symbol && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }, _typeof(obj); }

    function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _unsupportedIterableToArray(arr, i) || _nonIterableRest(); }

    function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method."); }

    function _unsupportedIterableToArray(o, minLen) { if (!o) return; if (typeof o === "string") return _arrayLikeToArray(o, minLen); var n = Object.prototype.toString.call(o).slice(8, -1); if (n === "Object" && o.constructor) n = o.constructor.name; if (n === "Map" || n === "Set") return Array.from(o); if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen); }

    function _arrayLikeToArray(arr, len) { if (len == null || len > arr.length) len = arr.length; for (var i = 0, arr2 = new Array(len); i < len; i++) { arr2[i] = arr[i]; } return arr2; }

    function _iterableToArrayLimit(arr, i) { var _i = arr == null ? null : typeof Symbol !== "undefined" && arr[Symbol.iterator] || arr["@@iterator"]; if (_i == null) return; var _arr = []; var _n = true; var _d = false; var _s, _e; try { for (_i = _i.call(arr); !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

    function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

    function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

    function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

    function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); Object.defineProperty(Constructor, "prototype", { writable: false }); return Constructor; }

    var AsYouType$1 = /*#__PURE__*/function () {
      /**
       * @param {(string|object)?} [optionsOrDefaultCountry] - The default country used for parsing non-international phone numbers. Can also be an `options` object.
       * @param {Object} metadata
       */
      function AsYouType(optionsOrDefaultCountry, metadata) {
        _classCallCheck(this, AsYouType);

        this.metadata = new Metadata(metadata);

        var _this$getCountryAndCa = this.getCountryAndCallingCode(optionsOrDefaultCountry),
            _this$getCountryAndCa2 = _slicedToArray(_this$getCountryAndCa, 2),
            defaultCountry = _this$getCountryAndCa2[0],
            defaultCallingCode = _this$getCountryAndCa2[1];

        this.defaultCountry = defaultCountry;
        this.defaultCallingCode = defaultCallingCode;
        this.reset();
      }

      _createClass(AsYouType, [{
        key: "getCountryAndCallingCode",
        value: function getCountryAndCallingCode(optionsOrDefaultCountry) {
          // Set `defaultCountry` and `defaultCallingCode` options.
          var defaultCountry;
          var defaultCallingCode; // Turns out `null` also has type "object". Weird.

          if (optionsOrDefaultCountry) {
            if (_typeof(optionsOrDefaultCountry) === 'object') {
              defaultCountry = optionsOrDefaultCountry.defaultCountry;
              defaultCallingCode = optionsOrDefaultCountry.defaultCallingCode;
            } else {
              defaultCountry = optionsOrDefaultCountry;
            }
          }

          if (defaultCountry && !this.metadata.hasCountry(defaultCountry)) {
            defaultCountry = undefined;
          }

          return [defaultCountry, defaultCallingCode];
        }
        /**
         * Inputs "next" phone number characters.
         * @param  {string} text
         * @return {string} Formatted phone number characters that have been input so far.
         */

      }, {
        key: "input",
        value: function input(text) {
          var _this$parser$input = this.parser.input(text, this.state),
              digits = _this$parser$input.digits,
              justLeadingPlus = _this$parser$input.justLeadingPlus;

          if (justLeadingPlus) {
            this.formattedOutput = '+';
          } else if (digits) {
            this.determineTheCountryIfNeeded(); // Match the available formats by the currently available leading digits.

            if (this.state.nationalSignificantNumber) {
              this.formatter.narrowDownMatchingFormats(this.state);
            }

            var formattedNationalNumber;

            if (this.metadata.hasSelectedNumberingPlan()) {
              formattedNationalNumber = this.formatter.format(digits, this.state);
            }

            if (formattedNationalNumber === undefined) {
              // See if another national (significant) number could be re-extracted.
              if (this.parser.reExtractNationalSignificantNumber(this.state)) {
                this.determineTheCountryIfNeeded(); // If it could, then re-try formatting the new national (significant) number.

                var nationalDigits = this.state.getNationalDigits();

                if (nationalDigits) {
                  formattedNationalNumber = this.formatter.format(nationalDigits, this.state);
                }
              }
            }

            this.formattedOutput = formattedNationalNumber ? this.getFullNumber(formattedNationalNumber) : this.getNonFormattedNumber();
          }

          return this.formattedOutput;
        }
      }, {
        key: "reset",
        value: function reset() {
          var _this = this;

          this.state = new AsYouTypeState({
            onCountryChange: function onCountryChange(country) {
              // Before version `1.6.0`, the official `AsYouType` formatter API
              // included the `.country` property of an `AsYouType` instance.
              // Since that property (along with the others) have been moved to
              // `this.state`, `this.country` property is emulated for compatibility
              // with the old versions.
              _this.country = country;
            },
            onCallingCodeChange: function onCallingCodeChange(country, callingCode) {
              _this.metadata.selectNumberingPlan(country, callingCode);

              _this.formatter.reset(_this.metadata.numberingPlan, _this.state);

              _this.parser.reset(_this.metadata.numberingPlan);
            }
          });
          this.formatter = new AsYouTypeFormatter({
            state: this.state,
            metadata: this.metadata
          });
          this.parser = new AsYouTypeParser({
            defaultCountry: this.defaultCountry,
            defaultCallingCode: this.defaultCallingCode,
            metadata: this.metadata,
            state: this.state,
            onNationalSignificantNumberChange: function onNationalSignificantNumberChange() {
              _this.determineTheCountryIfNeeded();

              _this.formatter.reset(_this.metadata.numberingPlan, _this.state);
            }
          });
          this.state.reset(this.defaultCountry, this.defaultCallingCode);
          this.formattedOutput = '';
          return this;
        }
        /**
         * Returns `true` if the phone number is being input in international format.
         * In other words, returns `true` if and only if the parsed phone number starts with a `"+"`.
         * @return {boolean}
         */

      }, {
        key: "isInternational",
        value: function isInternational() {
          return this.state.international;
        }
        /**
         * Returns the "calling code" part of the phone number when it's being input
         * in an international format.
         * If no valid calling code has been entered so far, returns `undefined`.
         * @return {string} [callingCode]
         */

      }, {
        key: "getCallingCode",
        value: function getCallingCode() {
          // If the number is being input in national format and some "default calling code"
          // has been passed to `AsYouType` constructor, then `this.state.callingCode`
          // is equal to that "default calling code".
          //
          // If the number is being input in national format and no "default calling code"
          // has been passed to `AsYouType` constructor, then returns `undefined`,
          // even if a "default country" has been passed to `AsYouType` constructor.
          //
          if (this.isInternational()) {
            return this.state.callingCode;
          }
        } // A legacy alias.

      }, {
        key: "getCountryCallingCode",
        value: function getCountryCallingCode() {
          return this.getCallingCode();
        }
        /**
         * Returns a two-letter country code of the phone number.
         * Returns `undefined` for "non-geographic" phone numbering plans.
         * Returns `undefined` if no phone number has been input yet.
         * @return {string} [country]
         */

      }, {
        key: "getCountry",
        value: function getCountry() {
          var digits = this.state.digits; // Return `undefined` if no digits have been input yet.

          if (digits) {
            return this._getCountry();
          }
        }
        /**
         * Returns a two-letter country code of the phone number.
         * Returns `undefined` for "non-geographic" phone numbering plans.
         * @return {string} [country]
         */

      }, {
        key: "_getCountry",
        value: function _getCountry() {
          var country = this.state.country;

          return country;
        }
      }, {
        key: "determineTheCountryIfNeeded",
        value: function determineTheCountryIfNeeded() {
          // Suppose a user enters a phone number in international format,
          // and there're several countries corresponding to that country calling code,
          // and a country has been derived from the number, and then
          // a user enters one more digit and the number is no longer
          // valid for the derived country, so the country should be re-derived
          // on every new digit in those cases.
          //
          // If the phone number is being input in national format,
          // then it could be a case when `defaultCountry` wasn't specified
          // when creating `AsYouType` instance, and just `defaultCallingCode` was specified,
          // and that "calling code" could correspond to a "non-geographic entity",
          // or there could be several countries corresponding to that country calling code.
          // In those cases, `this.country` is `undefined` and should be derived
          // from the number. Again, if country calling code is ambiguous, then
          // `this.country` should be re-derived with each new digit.
          //
          if (!this.state.country || this.isCountryCallingCodeAmbiguous()) {
            this.determineTheCountry();
          }
        } // Prepends `+CountryCode ` in case of an international phone number

      }, {
        key: "getFullNumber",
        value: function getFullNumber(formattedNationalNumber) {
          var _this2 = this;

          if (this.isInternational()) {
            var prefix = function prefix(text) {
              return _this2.formatter.getInternationalPrefixBeforeCountryCallingCode(_this2.state, {
                spacing: text ? true : false
              }) + text;
            };

            var callingCode = this.state.callingCode;

            if (!callingCode) {
              return prefix("".concat(this.state.getDigitsWithoutInternationalPrefix()));
            }

            if (!formattedNationalNumber) {
              return prefix(callingCode);
            }

            return prefix("".concat(callingCode, " ").concat(formattedNationalNumber));
          }

          return formattedNationalNumber;
        }
      }, {
        key: "getNonFormattedNationalNumberWithPrefix",
        value: function getNonFormattedNationalNumberWithPrefix() {
          var _this$state = this.state,
              nationalSignificantNumber = _this$state.nationalSignificantNumber,
              complexPrefixBeforeNationalSignificantNumber = _this$state.complexPrefixBeforeNationalSignificantNumber,
              nationalPrefix = _this$state.nationalPrefix;
          var number = nationalSignificantNumber;
          var prefix = complexPrefixBeforeNationalSignificantNumber || nationalPrefix;

          if (prefix) {
            number = prefix + number;
          }

          return number;
        }
      }, {
        key: "getNonFormattedNumber",
        value: function getNonFormattedNumber() {
          var nationalSignificantNumberMatchesInput = this.state.nationalSignificantNumberMatchesInput;
          return this.getFullNumber(nationalSignificantNumberMatchesInput ? this.getNonFormattedNationalNumberWithPrefix() : this.state.getNationalDigits());
        }
      }, {
        key: "getNonFormattedTemplate",
        value: function getNonFormattedTemplate() {
          var number = this.getNonFormattedNumber();

          if (number) {
            return number.replace(/[\+\d]/g, DIGIT_PLACEHOLDER);
          }
        }
      }, {
        key: "isCountryCallingCodeAmbiguous",
        value: function isCountryCallingCodeAmbiguous() {
          var callingCode = this.state.callingCode;
          var countryCodes = this.metadata.getCountryCodesForCallingCode(callingCode);
          return countryCodes && countryCodes.length > 1;
        } // Determines the country of the phone number
        // entered so far based on the country phone code
        // and the national phone number.

      }, {
        key: "determineTheCountry",
        value: function determineTheCountry() {
          this.state.setCountry(getCountryByCallingCode(this.isInternational() ? this.state.callingCode : this.defaultCallingCode, this.state.nationalSignificantNumber, this.metadata));
        }
        /**
         * Returns a E.164 phone number value for the user's input.
         *
         * For example, for country `"US"` and input `"(222) 333-4444"`
         * it will return `"+12223334444"`.
         *
         * For international phone number input, it will also auto-correct
         * some minor errors such as using a national prefix when writing
         * an international phone number. For example, if the user inputs
         * `"+44 0 7400 000000"` then it will return an auto-corrected
         * `"+447400000000"` phone number value.
         *
         * Will return `undefined` if no digits have been input,
         * or when inputting a phone number in national format and no
         * default country or default "country calling code" have been set.
         *
         * @return {string} [value]
         */

      }, {
        key: "getNumberValue",
        value: function getNumberValue() {
          var _this$state2 = this.state,
              digits = _this$state2.digits,
              callingCode = _this$state2.callingCode,
              country = _this$state2.country,
              nationalSignificantNumber = _this$state2.nationalSignificantNumber; // Will return `undefined` if no digits have been input.

          if (!digits) {
            return;
          }

          if (this.isInternational()) {
            if (callingCode) {
              return '+' + callingCode + nationalSignificantNumber;
            } else {
              return '+' + digits;
            }
          } else {
            if (country || callingCode) {
              var callingCode_ = country ? this.metadata.countryCallingCode() : callingCode;
              return '+' + callingCode_ + nationalSignificantNumber;
            }
          }
        }
        /**
         * Returns an instance of `PhoneNumber` class.
         * Will return `undefined` if no national (significant) number
         * digits have been entered so far, or if no `defaultCountry` has been
         * set and the user enters a phone number not in international format.
         */

      }, {
        key: "getNumber",
        value: function getNumber() {
          var _this$state3 = this.state,
              nationalSignificantNumber = _this$state3.nationalSignificantNumber,
              carrierCode = _this$state3.carrierCode,
              callingCode = _this$state3.callingCode; // `this._getCountry()` is basically same as `this.state.country`
          // with the only change that it return `undefined` in case of a
          // "non-geographic" numbering plan instead of `"001"` "internal use" value.

          var country = this._getCountry();

          if (!nationalSignificantNumber) {
            return;
          }

          if (!country && !callingCode) {
            return;
          }

          var phoneNumber = new PhoneNumber(country || callingCode, nationalSignificantNumber, this.metadata.metadata);

          if (carrierCode) {
            phoneNumber.carrierCode = carrierCode;
          } // Phone number extensions are not supported by "As You Type" formatter.


          return phoneNumber;
        }
        /**
         * Returns `true` if the phone number is "possible".
         * Is just a shortcut for `PhoneNumber.isPossible()`.
         * @return {boolean}
         */

      }, {
        key: "isPossible",
        value: function isPossible() {
          var phoneNumber = this.getNumber();

          if (!phoneNumber) {
            return false;
          }

          return phoneNumber.isPossible();
        }
        /**
         * Returns `true` if the phone number is "valid".
         * Is just a shortcut for `PhoneNumber.isValid()`.
         * @return {boolean}
         */

      }, {
        key: "isValid",
        value: function isValid() {
          var phoneNumber = this.getNumber();

          if (!phoneNumber) {
            return false;
          }

          return phoneNumber.isValid();
        }
        /**
         * @deprecated
         * This method is used in `react-phone-number-input/source/input-control.js`
         * in versions before `3.0.16`.
         */

      }, {
        key: "getNationalNumber",
        value: function getNationalNumber() {
          return this.state.nationalSignificantNumber;
        }
        /**
         * Returns the phone number characters entered by the user.
         * @return {string}
         */

      }, {
        key: "getChars",
        value: function getChars() {
          return (this.state.international ? '+' : '') + this.state.digits;
        }
        /**
         * Returns the template for the formatted phone number.
         * @return {string}
         */

      }, {
        key: "getTemplate",
        value: function getTemplate() {
          return this.formatter.getTemplate(this.state) || this.getNonFormattedTemplate() || '';
        }
      }]);

      return AsYouType;
    }();

    function isValidPhoneNumber() {
    	return withMetadataArgument(isValidPhoneNumber$1, arguments)
    }

    function findPhoneNumbersInText() {
    	return withMetadataArgument(findPhoneNumbersInText$1, arguments)
    }

    // Importing from a ".js" file is a workaround for Node.js "ES Modules"

    function AsYouType(country) {
    	return AsYouType$1.call(this, country, metadata)
    }

    AsYouType.prototype = Object.create(AsYouType$1.prototype, {});
    AsYouType.prototype.constructor = AsYouType;

    // Objects Values Predetermined
    let objErr = writable({
    	errorCbu: undefined,
    	errorData: undefined,
    	stateTrans: '',
    });
    let objInput = writable({
    	cbu: '',
    	data: '',
    });

    let values;
    objInput.subscribe(obj => values = obj);

    //Send Data
    const sendData = e => {
    	e.preventDefault();
    	let inputValues = [];

    	e.target.childNodes.forEach(elements => {
    		if (elements.nodeName === 'INPUT') {
    			inputValues.push(elements.value);
    		}		if (elements.nodeName === 'DIV') {
    			elements.childNodes.forEach(element => {
    				if (element.nodeName === 'INPUT') {
    					inputValues.push(element.value);
    				}
    			});
    		}
    	});

    	objInput.update(obj => {
    		obj.cbu = inputValues[0];
    		obj.data = inputValues[1];
    		return obj;
    	});

    	if (cbuValidator(values.cbu) || dataValidator(values.data)) {
    		if (cbuValidator(values.cbu) && dataValidator(values.data)) closePay.update(cls => cls = 'box-pay');
    	}
    };

    //CBU Validator
    const cbuLength = cbu => {
    	if (cbu.length === 22) {
    		objErr.update(obj => {
    			obj.errorCbu = undefined;
    			return obj;
    		});
    		return true;
    	}	objErr.update(obj => {
    		obj.errorCbu = 'CBU Length Incorrect';
    		return obj;
    	});
    };

    const codeBank = code => {
    	if (code.length === 8) { 
    		let bank = code.substr(0,3);
     		let digitoVerificador1 = code[3];
     		let branchOffice = code.substr(4,3);
     		let digitoVerificador2 = code[7];
     		let sum = bank[0] * 7 + bank[1] * 1 + bank[2] * 3 + digitoVerificador1 * 9 + branchOffice[0] * 7 + branchOffice[1] * 1 + branchOffice[2] * 3;
    		let difference = 10 - (sum % 10);
     		if (difference == digitoVerificador2) return true;
    		objErr.update(obj => {
    			obj.errorCbu = 'Bank Code Incorrect';
    			return obj;
    		});
    	}};

    const validateAccount = account => {
    	if (account.length === 14) {
    		let digitoVerificador = account[13];
     		let sum = account[0] * 3 + account[1] * 9 + account[2] * 7 + account[3] * 1 + account[4] * 3 + account[5] * 9 + account[6] * 7 + account[7] * 1 + account[8] * 3 + account[9] * 9 + account[10] * 7 + account[11] * 1 + account[12] * 3;
     		let difference = 10 - (sum % 10);
     		if(difference == digitoVerificador) return true;
    		objErr.update(obj => {
    			obj.errorCbu = 'Account Invalid';
    			return obj;
    		});
    	}};

    const cbuValidator = cbu => {
    	if (cbu.length === 0) return objErr.update(obj => {
    		obj.errorCbu = 'Please Insert Your CBU';
    		return obj;
    	});

    	if (/^\d+$/g.test(cbu)) return cbuLength(cbu) && codeBank(cbu.substr(0,8)) && validateAccount(cbu.substr(8,14));
    	
    	objErr.update(obj => {
    		obj.errorCbu = 'Only Numbers Are Allowed';
    		return obj;
    	});
    };

    //Data Validator
    let countryNumber = writable('AR');
    let country;
    countryNumber.subscribe(num => country = num);

    const numberValidator = number => {
    	if (isValidPhoneNumber(number, country)) {
    		objErr.update(obj => {
    			obj.errorData = undefined;
    			return obj;
    		});
    		return true;
    	}
    	objErr.update(obj => {
    		obj.errorData = 'Incorrect Number';
    		return obj;
    	});
    };

    const dataValidator = dates => {
    	if (dates.length !== 0) return numberValidator(dates);

    	objErr.update(obj => {
    		obj.errorData = 'Please Insert Number';
    		return obj;
    	});
    };

    //Send Info to Servers
    let repeat;

    const sendInfo = async e => {
    	e.preventDefault();
    	const userCbu = new FormData(e.target);
    	let cbu;

    	if (userCbu) {
    		const sendCbu = await fetch('https://apideno.deno.dev/veryfied', {
    			method: 'POST',
    			body: userCbu.get('cbu'),
    		});
    		cbu = await sendCbu.text();
    	}
    	if(cbu === 'await') repeat = setInterval(veryfied, 5000);
    };

    const veryfied = async () => {
    	const ctx = await fetch('https://apideno.deno.dev/veryfied');
    	const value = await ctx.text();

    	objErr.update(obj => {
    		obj.stateTrans = value;
    		return obj;
    	});

    	if (value === 'true') clearInterval(repeat);
    };

    /* src/PayTransfers.svelte generated by Svelte v3.48.0 */
    const file$7 = "src/PayTransfers.svelte";

    function create_fragment$7(ctx) {
    	let h2;
    	let t1;
    	let qrjs;
    	let t2;
    	let copy0;
    	let t3;
    	let copy1;
    	let t4;
    	let form;
    	let input;
    	let t5;
    	let button;
    	let current;
    	let mounted;
    	let dispose;
    	qrjs = new QRJS({ $$inline: true });

    	copy0 = new Copy({
    			props: { type: "ALIAS", ctx: "RUBIO.SALINA.COBRA" },
    			$$inline: true
    		});

    	copy1 = new Copy({
    			props: {
    				type: "CBU",
    				ctx: "1430001713020036980019"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			h2 = element$1("h2");
    			h2.textContent = "Complete Payments";
    			t1 = space();
    			create_component(qrjs.$$.fragment);
    			t2 = space();
    			create_component(copy0.$$.fragment);
    			t3 = space();
    			create_component(copy1.$$.fragment);
    			t4 = space();
    			form = element$1("form");
    			input = element$1("input");
    			t5 = space();
    			button = element$1("button");
    			button.textContent = "PAY SERVICES";
    			add_location(h2, file$7, 5, 0, 150);
    			attr_dev(input, "type", "hidden");
    			attr_dev(input, "name", "cbu");
    			add_location(input, file$7, 10, 2, 320);
    			add_location(button, file$7, 11, 2, 382);
    			form.noValidate = true;
    			add_location(form, file$7, 9, 0, 279);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t1, anchor);
    			mount_component(qrjs, target, anchor);
    			insert_dev(target, t2, anchor);
    			mount_component(copy0, target, anchor);
    			insert_dev(target, t3, anchor);
    			mount_component(copy1, target, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, form, anchor);
    			append_dev(form, input);
    			set_input_value(input, /*$objInput*/ ctx[0].cbu);
    			append_dev(form, t5);
    			append_dev(form, button);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(input, "input", /*input_input_handler*/ ctx[1]),
    					listen_dev(form, "submit", sendInfo, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$objInput*/ 1) {
    				set_input_value(input, /*$objInput*/ ctx[0].cbu);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(qrjs.$$.fragment, local);
    			transition_in(copy0.$$.fragment, local);
    			transition_in(copy1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(qrjs.$$.fragment, local);
    			transition_out(copy0.$$.fragment, local);
    			transition_out(copy1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t1);
    			destroy_component(qrjs, detaching);
    			if (detaching) detach_dev(t2);
    			destroy_component(copy0, detaching);
    			if (detaching) detach_dev(t3);
    			destroy_component(copy1, detaching);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(form);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let $objInput;
    	validate_store(objInput, 'objInput');
    	component_subscribe($$self, objInput, $$value => $$invalidate(0, $objInput = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('PayTransfers', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<PayTransfers> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		$objInput.cbu = this.value;
    		objInput.set($objInput);
    	}

    	$$self.$capture_state = () => ({
    		Qrjs: QRJS,
    		Copy,
    		sendInfo,
    		objInput,
    		$objInput
    	});

    	return [$objInput, input_input_handler];
    }

    class PayTransfers extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PayTransfers",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src/PaySucces.svelte generated by Svelte v3.48.0 */

    const file$6 = "src/PaySucces.svelte";

    function create_fragment$6(ctx) {
    	let h2;
    	let t1;
    	let img;
    	let img_src_value;
    	let t2;
    	let span;
    	let t3;
    	let br;
    	let t4;

    	const block = {
    		c: function create() {
    			h2 = element$1("h2");
    			h2.textContent = "Transference Complete";
    			t1 = space();
    			img = element$1("img");
    			t2 = space();
    			span = element$1("span");
    			t3 = text("Thanks for you await ");
    			br = element$1("br");
    			t4 = text(" Buy ok");
    			attr_dev(h2, "class", "svelte-uk4k2b");
    			set_style(h2, "margin-top", `2em`, false);
    			add_location(h2, file$6, 0, 0, 0);
    			if (!src_url_equal(img.src, img_src_value = "/check.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "complete");
    			attr_dev(img, "class", "svelte-uk4k2b");
    			add_location(img, file$6, 1, 0, 52);
    			add_location(br, file$6, 2, 27, 117);
    			attr_dev(span, "class", "svelte-uk4k2b");
    			add_location(span, file$6, 2, 0, 90);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, h2, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, img, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, span, anchor);
    			append_dev(span, t3);
    			append_dev(span, br);
    			append_dev(span, t4);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(h2);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(img);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('PaySucces', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<PaySucces> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class PaySucces extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PaySucces",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src/PayLoading.svelte generated by Svelte v3.48.0 */

    const file$5 = "src/PayLoading.svelte";

    function create_fragment$5(ctx) {
    	let div4;
    	let div0;
    	let t0;
    	let div1;
    	let t1;
    	let div2;
    	let t2;
    	let div3;
    	let t3;
    	let span;

    	const block = {
    		c: function create() {
    			div4 = element$1("div");
    			div0 = element$1("div");
    			t0 = space();
    			div1 = element$1("div");
    			t1 = space();
    			div2 = element$1("div");
    			t2 = space();
    			div3 = element$1("div");
    			t3 = space();
    			span = element$1("span");
    			span.textContent = "Await Confirm Transference";
    			attr_dev(div0, "class", "svelte-1btj27c");
    			add_location(div0, file$5, 1, 2, 25);
    			attr_dev(div1, "class", "svelte-1btj27c");
    			add_location(div1, file$5, 2, 2, 39);
    			attr_dev(div2, "class", "svelte-1btj27c");
    			add_location(div2, file$5, 3, 2, 53);
    			attr_dev(div3, "class", "svelte-1btj27c");
    			add_location(div3, file$5, 4, 2, 67);
    			attr_dev(div4, "class", "lds-ring svelte-1btj27c");
    			add_location(div4, file$5, 0, 0, 0);
    			attr_dev(span, "class", "svelte-1btj27c");
    			add_location(span, file$5, 6, 0, 86);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div4, anchor);
    			append_dev(div4, div0);
    			append_dev(div4, t0);
    			append_dev(div4, div1);
    			append_dev(div4, t1);
    			append_dev(div4, div2);
    			append_dev(div4, t2);
    			append_dev(div4, div3);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, span, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div4);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('PayLoading', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<PayLoading> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class PayLoading extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "PayLoading",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/ProductsPay.svelte generated by Svelte v3.48.0 */
    const file$4 = "src/ProductsPay.svelte";

    // (29:4) {:else}
    function create_else_block$1(ctx) {
    	let transfer;
    	let current;
    	transfer = new PayTransfers({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(transfer.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(transfer, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(transfer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(transfer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(transfer, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(29:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (27:44) 
    function create_if_block_1$1(ctx) {
    	let loading;
    	let current;
    	loading = new PayLoading({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(loading.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(loading, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(loading.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(loading.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(loading, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(27:44) ",
    		ctx
    	});

    	return block;
    }

    // (25:4) {#if $objErr.stateTrans == 'true'}
    function create_if_block$2(ctx) {
    	let sucess;
    	let current;
    	sucess = new PaySucces({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(sucess.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(sucess, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(sucess.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(sucess.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(sucess, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(25:4) {#if $objErr.stateTrans == 'true'}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let aside;
    	let div;
    	let button;
    	let t;
    	let current_block_type_index;
    	let if_block;
    	let aside_class_value;
    	let current;

    	button = new Button({
    			props: {
    				ctx: "close",
    				pos: "absolute",
    				lr: -1.3,
    				size: 3
    			},
    			$$inline: true
    		});

    	button.$on("click", /*click_handler*/ ctx[2]);
    	const if_block_creators = [create_if_block$2, create_if_block_1$1, create_else_block$1];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*$objErr*/ ctx[1].stateTrans == 'true') return 0;
    		if (/*$objErr*/ ctx[1].stateTrans == 'await') return 1;
    		return 2;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			aside = element$1("aside");
    			div = element$1("div");
    			create_component(button.$$.fragment);
    			t = space();
    			if_block.c();
    			attr_dev(div, "class", "svelte-cmazl8");
    			add_location(div, file$4, 13, 2, 392);
    			attr_dev(aside, "class", aside_class_value = "" + (null_to_empty(/*$closePay*/ ctx[0]) + " svelte-cmazl8"));
    			add_location(aside, file$4, 12, 0, 364);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, aside, anchor);
    			append_dev(aside, div);
    			mount_component(button, div, null);
    			append_dev(div, t);
    			if_blocks[current_block_type_index].m(div, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index !== previous_block_index) {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				}

    				transition_in(if_block, 1);
    				if_block.m(div, null);
    			}

    			if (!current || dirty & /*$closePay*/ 1 && aside_class_value !== (aside_class_value = "" + (null_to_empty(/*$closePay*/ ctx[0]) + " svelte-cmazl8"))) {
    				attr_dev(aside, "class", aside_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(aside);
    			destroy_component(button);
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const closePay = writable('');

    function instance$4($$self, $$props, $$invalidate) {
    	let $closePay,
    		$$unsubscribe_closePay = noop;

    	let $objErr;
    	validate_store(closePay, 'closePay');
    	component_subscribe($$self, closePay, $$value => $$invalidate(0, $closePay = $$value));
    	validate_store(objErr, 'objErr');
    	component_subscribe($$self, objErr, $$value => $$invalidate(1, $objErr = $$value));
    	$$self.$$.on_destroy.push(() => $$unsubscribe_closePay());
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ProductsPay', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ProductsPay> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => {
    		set_store_value(closePay, $closePay = '', $closePay);
    		set_store_value(objErr, $objErr.stateTrans = '', $objErr);
    	};

    	$$self.$capture_state = () => ({
    		writable,
    		closePay,
    		Transfer: PayTransfers,
    		Sucess: PaySucces,
    		Loading: PayLoading,
    		Button,
    		objErr,
    		$closePay,
    		$objErr
    	});

    	return [$closePay, $objErr, click_handler];
    }

    class ProductsPay extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ProductsPay",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/Input.svelte generated by Svelte v3.48.0 */
    const file$3 = "src/Input.svelte";

    // (20:2) {#if $objErr.errorCbu !== undefined}
    function create_if_block_1(ctx) {
    	let span;
    	let t_value = /*$objErr*/ ctx[2].errorCbu + "";
    	let t;

    	const block = {
    		c: function create() {
    			span = element$1("span");
    			t = text(t_value);
    			attr_dev(span, "class", "err-cbu svelte-zcow7f");
    			add_location(span, file$3, 20, 4, 810);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$objErr*/ 4 && t_value !== (t_value = /*$objErr*/ ctx[2].errorCbu + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(20:2) {#if $objErr.errorCbu !== undefined}",
    		ctx
    	});

    	return block;
    }

    // (31:2) {#if $objErr.errorData !== undefined}
    function create_if_block$1(ctx) {
    	let span;
    	let t_value = /*$objErr*/ ctx[2].errorData + "";
    	let t;

    	const block = {
    		c: function create() {
    			span = element$1("span");
    			t = text(t_value);
    			attr_dev(span, "class", "err-data svelte-zcow7f");
    			add_location(span, file$3, 31, 4, 1279);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, span, anchor);
    			append_dev(span, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$objErr*/ 4 && t_value !== (t_value = /*$objErr*/ ctx[2].errorData + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(span);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(31:2) {#if $objErr.errorData !== undefined}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let form;
    	let label0;
    	let t1;
    	let input0;
    	let t2;
    	let t3;
    	let label1;
    	let t5;
    	let div;
    	let input1;
    	let t6;
    	let select;
    	let option0;
    	let option1;
    	let t9;
    	let t10;
    	let button;
    	let mounted;
    	let dispose;
    	let if_block0 = /*$objErr*/ ctx[2].errorCbu !== undefined && create_if_block_1(ctx);
    	let if_block1 = /*$objErr*/ ctx[2].errorData !== undefined && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			form = element$1("form");
    			label0 = element$1("label");
    			label0.textContent = "Insert your CBU or CVU";
    			t1 = space();
    			input0 = element$1("input");
    			t2 = space();
    			if (if_block0) if_block0.c();
    			t3 = space();
    			label1 = element$1("label");
    			label1.textContent = "Insert your Number";
    			t5 = space();
    			div = element$1("div");
    			input1 = element$1("input");
    			t6 = space();
    			select = element$1("select");
    			option0 = element$1("option");
    			option0.textContent = "AR";
    			option1 = element$1("option");
    			option1.textContent = "BO";
    			t9 = space();
    			if (if_block1) if_block1.c();
    			t10 = space();
    			button = element$1("button");
    			button.textContent = "Continue";
    			attr_dev(label0, "for", "cbu");
    			attr_dev(label0, "class", "svelte-zcow7f");
    			add_location(label0, file$3, 17, 2, 620);
    			attr_dev(input0, "name", "cbu");
    			attr_dev(input0, "placeholder", "Insert CBU or CVU");
    			attr_dev(input0, "autocomplete", "off");
    			attr_dev(input0, "class", "svelte-zcow7f");
    			add_location(input0, file$3, 18, 2, 670);
    			attr_dev(label1, "for", "date");
    			attr_dev(label1, "class", "svelte-zcow7f");
    			add_location(label1, file$3, 22, 2, 868);
    			attr_dev(input1, "name", "date");
    			attr_dev(input1, "placeholder", "Insert Number.....");
    			attr_dev(input1, "autocomplete", "off");
    			attr_dev(input1, "class", "svelte-zcow7f");
    			add_location(input1, file$3, 24, 4, 925);
    			option0.__value = "AR";
    			option0.value = option0.__value;
    			add_location(option0, file$3, 26, 6, 1144);
    			option1.__value = "BO";
    			option1.value = option1.__value;
    			add_location(option1, file$3, 27, 6, 1181);
    			attr_dev(select, "class", "svelte-zcow7f");
    			if (/*$countryNumber*/ ctx[0] === void 0) add_render_callback(() => /*select_change_handler*/ ctx[8].call(select));
    			add_location(select, file$3, 25, 4, 1101);
    			attr_dev(div, "class", "svelte-zcow7f");
    			add_location(div, file$3, 23, 2, 915);
    			attr_dev(button, "type", "submit");
    			attr_dev(button, "class", "svelte-zcow7f");
    			add_location(button, file$3, 33, 2, 1339);
    			form.noValidate = true;
    			attr_dev(form, "class", "svelte-zcow7f");
    			add_location(form, file$3, 16, 0, 590);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, form, anchor);
    			append_dev(form, label0);
    			append_dev(form, t1);
    			append_dev(form, input0);
    			set_input_value(input0, /*$objInput*/ ctx[1].cbu);
    			append_dev(form, t2);
    			if (if_block0) if_block0.m(form, null);
    			append_dev(form, t3);
    			append_dev(form, label1);
    			append_dev(form, t5);
    			append_dev(form, div);
    			append_dev(div, input1);
    			set_input_value(input1, /*$objInput*/ ctx[1].data);
    			append_dev(div, t6);
    			append_dev(div, select);
    			append_dev(select, option0);
    			append_dev(select, option1);
    			select_option(select, /*$countryNumber*/ ctx[0]);
    			append_dev(form, t9);
    			if (if_block1) if_block1.m(form, null);
    			append_dev(form, t10);
    			append_dev(form, button);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[6]),
    					listen_dev(input1, "keyup", /*formatterNumber*/ ctx[3], false, false, false),
    					listen_dev(input1, "focus", /*pasteNumber*/ ctx[4], false, false, false),
    					listen_dev(input1, "blur", /*pasteNumber*/ ctx[4], false, false, false),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[7]),
    					listen_dev(select, "change", /*select_change_handler*/ ctx[8]),
    					listen_dev(form, "submit", /*submit_handler*/ ctx[5], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$objInput*/ 2 && input0.value !== /*$objInput*/ ctx[1].cbu) {
    				set_input_value(input0, /*$objInput*/ ctx[1].cbu);
    			}

    			if (/*$objErr*/ ctx[2].errorCbu !== undefined) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1(ctx);
    					if_block0.c();
    					if_block0.m(form, t3);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (dirty & /*$objInput*/ 2 && input1.value !== /*$objInput*/ ctx[1].data) {
    				set_input_value(input1, /*$objInput*/ ctx[1].data);
    			}

    			if (dirty & /*$countryNumber*/ 1) {
    				select_option(select, /*$countryNumber*/ ctx[0]);
    			}

    			if (/*$objErr*/ ctx[2].errorData !== undefined) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block$1(ctx);
    					if_block1.c();
    					if_block1.m(form, t10);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(form);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let $countryNumber;
    	let $objInput;
    	let $objErr;
    	validate_store(countryNumber, 'countryNumber');
    	component_subscribe($$self, countryNumber, $$value => $$invalidate(0, $countryNumber = $$value));
    	validate_store(objInput, 'objInput');
    	component_subscribe($$self, objInput, $$value => $$invalidate(1, $objInput = $$value));
    	validate_store(objErr, 'objErr');
    	component_subscribe($$self, objErr, $$value => $$invalidate(2, $objErr = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Input', slots, []);

    	const formatterNumber = e => {
    		let str = $countryNumber;
    		let city = findPhoneNumbersInText($objInput.data)[0];
    		set_store_value(objInput, $objInput.data = new AsYouType(str).input(e.target.value), $objInput);
    		if (city !== undefined) set_store_value(countryNumber, $countryNumber = city.number.country, $countryNumber);
    	};

    	const pasteNumber = () => {
    		let city = findPhoneNumbersInText($objInput.data)[0];
    		if (city !== undefined) set_store_value(countryNumber, $countryNumber = city.number.country, $countryNumber);
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Input> was created with unknown prop '${key}'`);
    	});

    	function submit_handler(event) {
    		bubble.call(this, $$self, event);
    	}

    	function input0_input_handler() {
    		$objInput.cbu = this.value;
    		objInput.set($objInput);
    	}

    	function input1_input_handler() {
    		$objInput.data = this.value;
    		objInput.set($objInput);
    	}

    	function select_change_handler() {
    		$countryNumber = select_value(this);
    		countryNumber.set($countryNumber);
    	}

    	$$self.$capture_state = () => ({
    		AsYouType,
    		findPhoneNumbersInText,
    		objErr,
    		objInput,
    		countryNumber,
    		formatterNumber,
    		pasteNumber,
    		$countryNumber,
    		$objInput,
    		$objErr
    	});

    	return [
    		$countryNumber,
    		$objInput,
    		$objErr,
    		formatterNumber,
    		pasteNumber,
    		submit_handler,
    		input0_input_handler,
    		input1_input_handler,
    		select_change_handler
    	];
    }

    class Input extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Input",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/ProductsInfo.svelte generated by Svelte v3.48.0 */
    const file$2 = "src/ProductsInfo.svelte";

    function create_fragment$2(ctx) {
    	let aside;
    	let button;
    	let t0;
    	let h2;
    	let t2;
    	let input;
    	let t3;
    	let payproduct;
    	let aside_class_value;
    	let current;

    	button = new Button({
    			props: {
    				size: 3,
    				ctx: "close",
    				pos: "absolute",
    				drn: "right"
    			},
    			$$inline: true
    		});

    	button.$on("click", /*click_handler*/ ctx[4]);
    	input = new Input({ $$inline: true });
    	input.$on("submit", sendData);
    	payproduct = new ProductsPay({ $$inline: true });

    	const block = {
    		c: function create() {
    			aside = element$1("aside");
    			create_component(button.$$.fragment);
    			t0 = space();
    			h2 = element$1("h2");
    			h2.textContent = "Complete Data";
    			t2 = space();
    			create_component(input.$$.fragment);
    			t3 = space();
    			create_component(payproduct.$$.fragment);
    			attr_dev(h2, "class", "svelte-1xpuuv7");
    			add_location(h2, file$2, 26, 2, 723);
    			attr_dev(aside, "class", aside_class_value = "" + (null_to_empty(/*$closeInfo*/ ctx[0]) + " svelte-1xpuuv7"));
    			add_location(aside, file$2, 12, 0, 414);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, aside, anchor);
    			mount_component(button, aside, null);
    			append_dev(aside, t0);
    			append_dev(aside, h2);
    			append_dev(aside, t2);
    			mount_component(input, aside, null);
    			append_dev(aside, t3);
    			mount_component(payproduct, aside, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*$closeInfo*/ 1 && aside_class_value !== (aside_class_value = "" + (null_to_empty(/*$closeInfo*/ ctx[0]) + " svelte-1xpuuv7"))) {
    				attr_dev(aside, "class", aside_class_value);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(button.$$.fragment, local);
    			transition_in(input.$$.fragment, local);
    			transition_in(payproduct.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(button.$$.fragment, local);
    			transition_out(input.$$.fragment, local);
    			transition_out(payproduct.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(aside);
    			destroy_component(button);
    			destroy_component(input);
    			destroy_component(payproduct);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const scroll = writable(false);
    const closeInfo = writable('');
    const Products = writable({});

    function instance$2($$self, $$props, $$invalidate) {
    	let $closeInfo,
    		$$unsubscribe_closeInfo = noop;

    	let $scroll,
    		$$unsubscribe_scroll = noop;

    	let $objInput;
    	let $objErr;
    	validate_store(closeInfo, 'closeInfo');
    	component_subscribe($$self, closeInfo, $$value => $$invalidate(0, $closeInfo = $$value));
    	validate_store(scroll, 'scroll');
    	component_subscribe($$self, scroll, $$value => $$invalidate(1, $scroll = $$value));
    	validate_store(objInput, 'objInput');
    	component_subscribe($$self, objInput, $$value => $$invalidate(2, $objInput = $$value));
    	validate_store(objErr, 'objErr');
    	component_subscribe($$self, objErr, $$value => $$invalidate(3, $objErr = $$value));
    	$$self.$$.on_destroy.push(() => $$unsubscribe_closeInfo());
    	$$self.$$.on_destroy.push(() => $$unsubscribe_scroll());
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ProductsInfo', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ProductsInfo> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => {
    		set_store_value(closeInfo, $closeInfo = '', $closeInfo);
    		set_store_value(scroll, $scroll = false, $scroll);
    		set_store_value(objInput, $objInput.cbu = '', $objInput);
    		set_store_value(objInput, $objInput.data = '', $objInput);
    		set_store_value(objErr, $objErr.errorCbu = undefined, $objErr);
    		set_store_value(objErr, $objErr.errorData = undefined, $objErr);
    	};

    	$$self.$capture_state = () => ({
    		writable,
    		scroll,
    		closeInfo,
    		Products,
    		PayProduct: ProductsPay,
    		Button,
    		sendData,
    		objErr,
    		objInput,
    		Input,
    		$closeInfo,
    		$scroll,
    		$objInput,
    		$objErr
    	});

    	return [$closeInfo, $scroll, $objInput, $objErr, click_handler];
    }

    class ProductsInfo extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ProductsInfo",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src/Section.svelte generated by Svelte v3.48.0 */
    const file$1 = "src/Section.svelte";

    function create_fragment$1(ctx) {
    	let section;
    	let boxproduct;
    	let t;
    	let infoproduct;
    	let current;
    	boxproduct = new ProductsBox({ $$inline: true });
    	boxproduct.$on("click", /*passInfoProducts*/ ctx[0]);
    	infoproduct = new ProductsInfo({ $$inline: true });

    	const block = {
    		c: function create() {
    			section = element$1("section");
    			create_component(boxproduct.$$.fragment);
    			t = space();
    			create_component(infoproduct.$$.fragment);
    			set_style(section, "margin-top", "2em");
    			attr_dev(section, "class", "svelte-pzkbgd");
    			add_location(section, file$1, 27, 0, 819);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			mount_component(boxproduct, section, null);
    			append_dev(section, t);
    			mount_component(infoproduct, section, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(boxproduct.$$.fragment, local);
    			transition_in(infoproduct.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(boxproduct.$$.fragment, local);
    			transition_out(infoproduct.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			destroy_component(boxproduct);
    			destroy_component(infoproduct);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let $Products;
    	let $scroll;
    	let $closeInfo;
    	validate_store(Products, 'Products');
    	component_subscribe($$self, Products, $$value => $$invalidate(1, $Products = $$value));
    	validate_store(scroll, 'scroll');
    	component_subscribe($$self, scroll, $$value => $$invalidate(2, $scroll = $$value));
    	validate_store(closeInfo, 'closeInfo');
    	component_subscribe($$self, closeInfo, $$value => $$invalidate(3, $closeInfo = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Section', slots, []);
    	const names = ['name', 'price', 'mounth', 'src'];

    	const passInfoProducts = e => {
    		set_store_value(closeInfo, $closeInfo = 'paybox', $closeInfo);
    		set_store_value(scroll, $scroll = true, $scroll);
    		let box = e.target.parentNode.parentNode;
    		let i = -1;
    		i++;
    		set_store_value(Products, $Products[names[i]] = box.childNodes[0].textContent, $Products);

    		box.childNodes[4].childNodes.forEach(num => {
    			if (num.textContent !== ' ') {
    				const val = num.textContent.match(/\d+/g)[0];
    				i++;
    				set_store_value(Products, $Products[names[i]] = val, $Products);
    			}
    		});

    		box.childNodes[2].childNodes.forEach(img => {
    			if (img.nodeName === 'IMG') {
    				i++;
    				set_store_value(Products, $Products[names[i]] = img.src, $Products);
    			}
    		});
    	};

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Section> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		BoxProduct: ProductsBox,
    		InfoProduct: ProductsInfo,
    		closeInfo,
    		Products,
    		scroll,
    		names,
    		passInfoProducts,
    		$Products,
    		$scroll,
    		$closeInfo
    	});

    	return [passInfoProducts];
    }

    class Section extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Section",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.48.0 */
    const file = "src/App.svelte";

    // (16:2) {:else}
    function create_else_block(ctx) {
    	let style;

    	const block = {
    		c: function create() {
    			style = element$1("style");
    			style.textContent = "body {\n        overflow-x: hidden;\n      }";
    			add_location(style, file, 16, 4, 500);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, style, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(style);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(16:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (10:2) {#if $scroll}
    function create_if_block(ctx) {
    	let style;

    	const block = {
    		c: function create() {
    			style = element$1("style");
    			style.textContent = "body {\n        overflow: hidden;\n      }";
    			add_location(style, file, 10, 4, 418);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, style, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(style);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(10:2) {#if $scroll}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let link0;
    	let link1;
    	let if_block_anchor;
    	let t0;
    	let main;
    	let header;
    	let t1;
    	let nav;
    	let t2;
    	let section;
    	let current;

    	function select_block_type(ctx, dirty) {
    		if (/*$scroll*/ ctx[0]) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);
    	header = new Header({ $$inline: true });
    	nav = new Nav({ $$inline: true });
    	section = new Section({ $$inline: true });

    	const block = {
    		c: function create() {
    			link0 = element$1("link");
    			link1 = element$1("link");
    			if_block.c();
    			if_block_anchor = empty();
    			t0 = space();
    			main = element$1("main");
    			create_component(header.$$.fragment);
    			t1 = space();
    			create_component(nav.$$.fragment);
    			t2 = space();
    			create_component(section.$$.fragment);
    			attr_dev(link0, "href", "https://fonts.googleapis.com/css2?family=Source+Sans+Pro&display=swap");
    			attr_dev(link0, "rel", "stylesheet");
    			add_location(link0, file, 7, 2, 203);
    			attr_dev(link1, "href", "https://fonts.googleapis.com/css2?family=Roboto&display=swap");
    			attr_dev(link1, "rel", "stylesheet");
    			add_location(link1, file, 8, 2, 306);
    			add_location(main, file, 24, 0, 594);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document.head, link0);
    			append_dev(document.head, link1);
    			if_block.m(document.head, null);
    			append_dev(document.head, if_block_anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, main, anchor);
    			mount_component(header, main, null);
    			append_dev(main, t1);
    			mount_component(nav, main, null);
    			append_dev(main, t2);
    			mount_component(section, main, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(header.$$.fragment, local);
    			transition_in(nav.$$.fragment, local);
    			transition_in(section.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(header.$$.fragment, local);
    			transition_out(nav.$$.fragment, local);
    			transition_out(section.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			detach_dev(link0);
    			detach_dev(link1);
    			if_block.d(detaching);
    			detach_dev(if_block_anchor);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(main);
    			destroy_component(header);
    			destroy_component(nav);
    			destroy_component(section);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let $scroll;
    	validate_store(scroll, 'scroll');
    	component_subscribe($$self, scroll, $$value => $$invalidate(0, $scroll = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Header, Nav, Section, scroll, $scroll });
    	return [$scroll];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    new App({
        target: document.body,
    });

})();
//# sourceMappingURL=bundle.js.map
