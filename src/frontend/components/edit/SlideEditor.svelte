<script lang="ts">
    import { slide } from "svelte/transition"
    import type { MediaFit } from "../../../types/Main"
    import { activeEdit, activeShow, dictionary, driveData, labelsDisabled, media, outputs, refreshEditSlide, showsCache, styles } from "../../stores"
    import MediaLoader from "../drawer/media/MediaLoader.svelte"
    import { history } from "../helpers/history"
    import Icon from "../helpers/Icon.svelte"
    import { getActiveOutputs, getResolution } from "../helpers/output"
    import { getMediaFilter } from "../helpers/showActions"
    import { _show } from "../helpers/shows"
    import { getStyles } from "../helpers/style"
    import T from "../helpers/T.svelte"
    import Button from "../inputs/Button.svelte"
    import { getStyleResolution } from "../slide/getStyleResolution"
    import Zoomed from "../slide/Zoomed.svelte"
    import Center from "../system/Center.svelte"
    import DropArea from "../system/DropArea.svelte"
    import Snaplines from "../system/Snaplines.svelte"
    import Editbox from "./Editbox.svelte"

    $: currentShow = $activeShow?.id
    $: if (currentShow && $showsCache[currentShow] && $activeEdit.slide === null && _show("active").slides().get().length) activeEdit.set({ slide: 0, items: [] })
    $: ref = currentShow && $showsCache[currentShow] ? _show("active").layouts("active").ref()[0] : null
    $: Slide = $activeEdit.slide !== null && ref?.[$activeEdit.slide!] ? _show("active").slides([ref[$activeEdit.slide!]?.id]).get()[0] : null

    let lines: [string, number][] = []
    let mouse: any = null
    let newStyles: any = {}
    $: active = $activeEdit.items

    let width: number = 0
    let height: number = 0
    $: resolution = getResolution(Slide?.settings?.resolution, { $outputs, $styles })
    // TODO: zoom more in...

    let ratio: number = 1

    $: layoutSlide = ref?.[$activeEdit.slide!]?.data || {}
    // get backgruond
    $: bgId = layoutSlide.background
    // $: loadFullImage = !!layoutSlide.background
    let loadFullImage = true

    // get ghost background
    $: if (!bgId) {
        ref?.forEach((a, i) => {
            if (i <= $activeEdit.slide! && !a.data.disabled) {
                if (a.data.actions?.clearBackground) bgId = null
                else if (a.data.background) bgId = a.data.background
            }
        })
    }

    $: background = bgId && currentShow ? $showsCache[currentShow].media[bgId] : null
    $: cloudId = $driveData.mediaId
    $: bgPath = cloudId && cloudId !== "default" && background ? background.cloud?.[cloudId] || background.path || "" : background?.path || ""
    // $: slideOverlays = layoutSlide.overlays || []

    let filter: string = ""
    let flipped: boolean = false
    let fit: MediaFit = "contain"
    let speed: string = "1"

    $: currentOutput = $outputs[getActiveOutputs()[0]]
    $: currentStyle = $styles[currentOutput?.style || ""] || {}

    $: if (bgPath) {
        // TODO: use show filter if existing
        filter = getMediaFilter(bgPath)
        flipped = $media[bgPath]?.flipped || false
        fit = currentStyle?.fit || $media[bgPath]?.fit || "contain"
        speed = $media[bgPath]?.speed || "1"
    }

    $: {
        if (active.length) updateStyles()
        else newStyles = {}
    }

    let updateTimeout: any = null
    function updateStyles() {
        if (!Object.keys(newStyles).length) return

        let items = $showsCache[$activeShow?.id!].slides[ref[$activeEdit.slide!]?.id].items
        let values: any[] = []
        active.forEach((id) => {
            let item = items[id]
            if (item) {
                let styles: any = getStyles(item.style)
                let textStyles: string = ""

                Object.entries(newStyles).forEach(([key, value]: any) => (styles[key] = value))
                Object.entries(styles).forEach((obj) => (textStyles += obj[0] + ":" + obj[1] + ";"))

                values.push(textStyles)
            }
        })

        let slideId = ref[$activeEdit.slide!].id
        let activeItems = [...active]

        history({
            id: "setStyle",
            newData: { style: { key: "style", values } },
            location: { page: "edit", show: $activeShow!, slide: slideId, items: activeItems },
        })

        if (!items[0]?.auto) return
        // recalculate auto size
        if (updateTimeout) clearTimeout(updateTimeout)
        updateTimeout = setTimeout(resetAutoSize, 3000)

        function resetAutoSize() {
            showsCache.update((a) => {
                delete a[$activeShow!.id].slides[slideId].items[activeItems[0] || 0].autoFontSize
                return a
            })

            refreshEditSlide.set(true)
        }
    }

    // $: if (Object.keys(newStyles).length && $showsCache[$activeShow?.id!] && active.length) {
    //   // let items = $showsCache[$activeShow?.id!].slides[ref[$activeEdit.slide!].id].items
    //   let items = _show("active").slides([ref[$activeEdit.slide!].id]).items().get()[0]
    //   if (items) autoSize(active, items)
    // }

    let altKeyPressed: boolean = false
    function keydown(e: any) {
        if (e.altKey) {
            e.preventDefault()
            altKeyPressed = true
        }
    }
    function keyup() {
        altKeyPressed = false
    }

    // ZOOM
    let zoom = 1

    // shortcut
    let nextScrollTimeout: any = null
    function wheel(e: any) {
        if (!e.ctrlKey && !e.metaKey) return
        if (nextScrollTimeout) return
        if (!e.target.closest(".editArea")) return

        zoom = Number(Math.max(0.5, Math.min(2, zoom + (e.deltaY < 0 ? -0.1 : 0.1))).toFixed(2))

        // don't start timeout if scrolling with mouse
        if (e.deltaY > 100 || e.deltaY < -100) return
        nextScrollTimeout = setTimeout(() => {
            nextScrollTimeout = null
        }, 500)
    }

    // menu
    let zoomOpened: boolean = false
    function mousedown(e: any) {
        keyup()
        if (e.target.closest(".zoom_container") || e.target.closest("button")) return

        zoomOpened = false
    }

    // CHORDS
    let chordsMode: boolean = false
    function toggleChords() {
        chordsMode = !chordsMode
    }

    $: slideFilter = ""
    $: if (!layoutSlide.filterEnabled || layoutSlide.filterEnabled?.includes("background")) getSlideFilter()
    function getSlideFilter() {
        slideFilter = ""
        if (layoutSlide.filter) slideFilter += "filter: " + layoutSlide.filter + ";"
        if (layoutSlide["backdrop-filter"]) slideFilter += "backdrop-filter: " + layoutSlide["backdrop-filter"] + ";"
    }

    // remove overflow if scrollbars are flickering over 25 times per second
    let hideOverflow: boolean = false
    // let changedTimes: number = 0
    // $: if (ratio) changedTimes++
    // $: if (!ratioTimeout && changedTimes > 2) startTimeout()
    // $: if (ratio && hideOverflow && !ratioTimeout && changedTimes > 1) hideOverflow = false

    // let ratioTimeout: any = null
    // function startTimeout() {
    //     ratioTimeout = setTimeout(() => {
    //         if (changedTimes > 5) hideOverflow = true
    //         changedTimes = 0
    //         setTimeout(() => {
    //             ratioTimeout = null
    //         }, 10)
    //     }, 200)
    // }
</script>

<svelte:window on:keydown={keydown} on:keyup={keyup} on:mousedown={mousedown} on:wheel={wheel} />

<div class="editArea">
    <!-- zoom: {1 / zoom}; -->
    <!-- width: {100 / zoom}%;height: {100 / zoom}%; -->
    <div class="parent" bind:offsetWidth={width} bind:offsetHeight={height}>
        {#if Slide}
            <DropArea id="edit">
                <Zoomed background={Slide?.settings?.color || currentStyle.background || "black"} {resolution} style={getStyleResolution(resolution, width, height, "fit", { zoom })} bind:ratio {hideOverflow} center={zoom >= 1}>
                    <!-- <div class="chordsButton" style="zoom: {1 / ratio};">
                        <Button on:click={toggleChords}>
                            <Icon id="chords" white={!chordsMode} />
                        </Button>
                    </div> -->
                    <!-- background -->
                    {#if !altKeyPressed && background}
                        <div class="background" style="zoom: {1 / ratio};opacity: 0.5;{slideFilter};height: 100%;width: 100%;">
                            <MediaLoader path={bgPath || background.id || ""} {loadFullImage} type={background.type !== "player" ? background.type : null} {filter} {flipped} {fit} {speed} />
                        </div>
                    {/if}
                    <!-- edit -->
                    <Snaplines bind:lines bind:newStyles bind:mouse {ratio} {active} />
                    {#key $activeEdit.slide || $activeEdit.id}
                        {#each Slide.items as item, index}
                            <Editbox
                                filter={layoutSlide.filterEnabled?.includes("foreground") ? layoutSlide.filter : ""}
                                backdropFilter={layoutSlide.filterEnabled?.includes("foreground") ? layoutSlide["backdrop-filter"] : ""}
                                {item}
                                {chordsMode}
                                ref={{ showId: currentShow, id: Slide.id }}
                                {index}
                                {ratio}
                                bind:mouse
                            />
                        {/each}
                    {/key}
                    <!-- overlays -->
                    <!-- {#if !altKeyPressed && slideOverlays?.length}
            <div style="opacity: 0.5;pointer-events: none;">
              {#each slideOverlays as id}
                {#if $overlays[id]}
                  {#each $overlays[id].items as item}
                    <Textbox {item} ref={{ type: "overlay", id }} />
                  {/each}
                {/if}
              {/each}
            </div>
          {/if} -->
                </Zoomed>
            </DropArea>
        {:else}
            <Center size={2} faded>
                <T id="empty.slide" />
            </Center>
        {/if}
    </div>
    <div class="actions">
        {#if Slide?.notes}
            <div class="notes">
                <Icon id="notes" right white />
                {@html Slide.notes.replaceAll("\n", "&nbsp;")}
            </div>
        {/if}

        <div class="actions" style="height: 100%;justify-content: right;">
            <Button on:click={toggleChords} title={$dictionary.edit?.chords}>
                <Icon id="chords" white={!chordsMode} right={!$labelsDisabled} />
                {#if !$labelsDisabled}<T id="edit.chords" />{/if}
            </Button>

            <div class="seperator" />

            <Button on:click={() => (zoomOpened = !zoomOpened)} title={$dictionary.actions?.zoom}>
                <Icon size={1.3} id="zoomIn" white />
            </Button>
            {#if zoomOpened}
                <div class="zoom_container" transition:slide>
                    <Button style="padding: 0 !important;width: 100%;" on:click={() => (zoom = 1)} bold={false} center>
                        <p class="text" title={$dictionary.actions?.resetZoom}>{(100 / zoom).toFixed()}%</p>
                    </Button>
                    <Button disabled={zoom <= 0.5} on:click={() => (zoom = Number((zoom - 0.1).toFixed(2)))} title={$dictionary.actions?.zoomIn}>
                        <Icon size={1.3} id="add" white />
                    </Button>
                    <Button disabled={zoom >= 2} on:click={() => (zoom = Number((zoom + 0.1).toFixed(2)))} title={$dictionary.actions?.zoomOut}>
                        <Icon size={1.3} id="remove" white />
                    </Button>
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    .editArea {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
    }

    .parent {
        width: 100%;
        height: 100%;
        display: flex;
        overflow: auto;
        /* justify-content: center;
        align-items: center; */
        /* padding: 10px; */

        /* WIP try to fix scrollbar content flickering */
        /* setting .slide elem to overflow: hidden; works... */
        /* overflow: overlay;
        z-index: 1; */
        /* scrollbar-gutter: stable both-edges; */
    }

    /* .chordsButton {
        position: absolute;
        top: 0;
        right: 0;
        background-color: var(--focus);
    }
    .chordsButton :global(button) {
        padding: 10px !important;
        z-index: 3;
    } */

    .actions {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        background-color: var(--primary-darkest);
        /* border-top: 3px solid var(--primary-lighter); */
    }

    .notes {
        padding: 0 8px;
        display: flex;
        align-items: center;
    }

    /* fixed height for consistent heights */
    .actions :global(button) {
        min-height: 28px;
        padding: 0 0.8em !important;
    }

    .seperator {
        width: 2px;
        height: 100%;
        background-color: var(--primary);
        /* margin: 0 10px; */
    }

    .text {
        opacity: 0.8;
        text-align: center;
        padding: 0.5em 0;
    }

    .zoom_container {
        position: absolute;
        right: 0;
        top: 0;
        transform: translateY(-100%);
        overflow: hidden;
        z-index: 30;

        flex-direction: column;
        width: auto;
        /* border-left: 3px solid var(--primary-lighter);
        border-top: 3px solid var(--primary-lighter); */
        background-color: inherit;
    }
</style>
