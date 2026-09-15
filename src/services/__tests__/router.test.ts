import { describe, expect, it } from 'vitest'
import { matchActions } from '../../components/search/actions'
import { parseLocationPath } from '../../utils/navigation'

describe('deep links', () => {
  it('parses website and universe paths', () => {
    expect(parseLocationPath('/website/github')).toEqual({ websiteId: 'github' })
    expect(parseLocationPath('/website/GitHub/')).toEqual({ websiteId: 'github' })
    expect(parseLocationPath('/universe/ai')).toEqual({ universeId: 'ai' })
    expect(parseLocationPath('/')).toEqual({})
    expect(parseLocationPath('/website/../etc')).toEqual({})
    expect(parseLocationPath('/website/github/extra')).toEqual({})
  })
})

describe('command palette', () => {
  it('matches actions by label tokens', () => {
    expect(matchActions('trending').map((a) => a.id)).toEqual(['trending'])
    expect(matchActions('show').map((a) => a.id)).toEqual(['trending', 'emerging'])
    expect(matchActions('github')).toEqual([])
    expect(matchActions('')).toEqual([])
  })
  it('lists every action for a bare ">"', () => {
    expect(matchActions('>').length).toBe(8)
    expect(matchActions('> mini').map((a) => a.id)).toEqual(['minimap'])
  })
})
