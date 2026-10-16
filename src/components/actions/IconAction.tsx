import { IconButton, Tooltip, type IconButtonProps } from '@mui/material'
import type { ElementType, ReactNode } from 'react'

type IconActionProps = {
  title: string
  children: ReactNode
  onClick?: IconButtonProps['onClick']
  color?: IconButtonProps['color']
  disabled?: boolean
  component?: ElementType
  to?: string
  edge?: IconButtonProps['edge']
  sx?: IconButtonProps['sx']
}

export function IconAction({
  title,
  children,
  onClick,
  color = 'default',
  disabled,
  component,
  to,
  edge,
  sx,
}: IconActionProps) {
  const button = (
    <IconButton
      size="small"
      color={color}
      onClick={onClick}
      disabled={disabled}
      edge={edge}
      aria-label={title}
      sx={sx}
      {...(component
        ? { component, to }
        : {})}
    >
      {children}
    </IconButton>
  )

  return (
    <Tooltip title={title}>
      {disabled ? <span>{button}</span> : button}
    </Tooltip>
  )
}
