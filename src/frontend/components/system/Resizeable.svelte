<script lang="ts">
    export let id: string
    export let side: "left" | "right" | "top" | "bottom" = "left"
    export let width: number = 300
    let defaultWidth: number = Number(width.toString())
    let handleWidth: number = 4
    export let maxWidth: number = defaultWidth * 2 // * 3
    export let minWidth: number = handleWidth

    let move: boolean = false
    let mouse: null | { x: number; y: number; offset: number; target: any } = null

    $: handleWidth = width <= 8 ? 8 : 4

    const conditions = {
        left: (e: any) => e.target.closest(".panel")?.offsetWidth - e.offsetX <= handleWidth,
        right: (e: any) => e.clientX < e.target.closest(".panel")?.offsetLeft + handleWidth && e.offsetX <= handleWidth && e.offsetX >= 0,
        // top: (e: any) => e.target.closest(".panel")?.offsetHeight - e.offsetY <= handleWidth,
        top: (e: any) => e.clientY < e.target.closest(".panel")?.offsetTop + handleWidth && e.offsetY <= handleWidth && e.offsetY >= 0,
        bottom: (e: any) => e.clientY < e.target.closest(".panel")?.offsetTop + e.target.closest(".panel")?.offsetParent.offsetTop + handleWidth && e.offsetY <= handleWidth && e.offsetY >= 0,
    }

    function mousedown(e: any) {
        if (!conditions[side](e)) return

        mouse = {
            x: e.clientX,
            y: e.clientY,
            offset: side === "top" || side === "bottom" ? window.innerHeight - width - e.clientY : window.innerWidth - width - e.clientX,
            target: e.target,
        }
    }

    const widths = {
        left: (e: any) => e.clientX,
        right: (e: any) => window.innerWidth - e.clientX - mouse!.offset,
        top: (e: any) => e.clientY,
        bottom: (e: any) => window.innerHeight - e.clientY - mouse!.offset,
    }

    function getWidth(width: number) {
        if (width < (defaultWidth * 0.6) / 2) return minWidth
        if (width < defaultWidth * 0.6) return defaultWidth * 0.6
        if (width > defaultWidth - 20 && width < defaultWidth + 20) return defaultWidth
        if (width > maxWidth) return maxWidth
        move = true
        return width
    }

    function mousemove(e: any) {
        if (mouse) width = getWidth(widths[side](e))
    }

    let storeWidth: null | number = null
    // TODO: pressing button with keyboard will close panel
    function click(e: any) {
        if (move || !conditions[side](e)) {
            move = false
            return
        }

        if (width > minWidth) {
            storeWidth = width
            width = minWidth
            return
        }

        width = storeWidth === null || storeWidth < defaultWidth / 2 ? defaultWidth : storeWidth
        storeWidth = null
    }

    function mouseup(e: any) {
        mouse = null
        if (!e.target.closest(".panel")) move = false
    }
</script>

<svelte:window on:mouseup={mouseup} on:mousemove={mousemove} />

<div {id} style="{side === 'left' || side === 'right' ? 'width' : 'height'}: {width}px; --handle-width: {handleWidth}px" class="panel bar_{side}" class:zero={width <= handleWidth} on:mousedown={mousedown} on:click={click}>
    <slot {width} />
</div>

<style>
    div {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        overflow: hidden;
        position: relative;
    }

    :global(.bar_left) {
        padding-right: var(--handle-width);
    }
    :global(.bar_right) {
        padding-left: var(--handle-width);
    }
    :global(.bar_top) {
        padding-bottom: var(--handle-width);
    }
    :global(.bar_bottom) {
        padding-top: var(--handle-width);
    }

    div::after {
        content: "";
        background-color: var(--primary-lighter);
        position: absolute;
        width: 100%;
        height: 100%;
    }
    .zero::after {
        background-color: var(--secondary);
    }

    div:global(.bar_left)::after {
        right: 0;
        width: var(--handle-width);
        cursor: ew-resize;
    }
    div:global(.bar_right)::after {
        left: 0;
        width: var(--handle-width);
        cursor: ew-resize;
    }
    div:global(.bar_top)::after {
        bottom: 0;
        height: var(--handle-width);
        cursor: ns-resize;
    }
    div:global(.bar_bottom)::after {
        top: 0;
        height: var(--handle-width);
        cursor: ns-resize;
    }
</style>
